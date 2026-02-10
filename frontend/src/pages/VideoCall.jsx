import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import API from '../api';
import './VideoCall.css';

export default function VideoCall() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessData, setAccessData] = useState(null);
  const [callStarted, setCallStarted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [doctorConnected, setDoctorConnected] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const clientRef = useRef(null);
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null });
  const isJoiningRef = useRef(false);
  const isEndingCallRef = useRef(false);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    console.log('VideoCall component mounted, appointmentId:', appointmentId);
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');

    if (!token || !userId) {
      console.log('No token or user ID found, redirecting to login');
      navigate('/login', { state: { from: `/video-call/${appointmentId}` } });
      return;
    }

    const verifyAccess = async () => {
      try {
        console.log('Verifying patient video access for appointment:', appointmentId);
        const response = await API.get(`/appointments/${appointmentId}/video-access`);
        console.log('Access data received:', response.data);
        setAccessData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Patient video access error:', err.response || err);
        let errorMessage = err.response?.data?.msg || 'Failed to verify video call access';
        if (err.response?.status === 401 || err.response?.status === 422) {
          errorMessage = 'Unauthorized or invalid token. Please log in again.';
          localStorage.removeItem('token');
          localStorage.removeItem('user_id');
          navigate('/login');
        } else if (err.response?.status === 404) {
          errorMessage = 'Appointment not found.';
        }
        setError(errorMessage);
        setLoading(false);
      }
    };

    verifyAccess();

    return () => {
      const cleanup = async () => {
        console.log('Cleaning up video call resources on unmount');
        try {
          if (!isEndingCallRef.current && hasJoinedRef.current) {
            await cleanupVideoCall();
          }
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      };
      cleanup();
    };
  }, [appointmentId, navigate]);

  useEffect(() => {
    if (!accessData || !localVideoRef.current || !remoteVideoRef.current || isJoiningRef.current || hasJoinedRef.current) {
      console.log('Access data or video refs missing, or already joining:', {
        accessData: !!accessData,
        localVideoRef: !!localVideoRef.current,
        remoteVideoRef: !!remoteVideoRef.current,
        isJoining: isJoiningRef.current,
        hasJoined: hasJoinedRef.current,
      });
      return;
    }

    const initAgoraCall = async () => {
      if (isJoiningRef.current || hasJoinedRef.current) {
        console.log('Already joining or joined, skipping...');
        return;
      }
      
      isJoiningRef.current = true;
      setConnectionStatus('Setting up video call...');
      
      try {
        console.log('Initializing Agora call for patient');
        const appId = process.env.REACT_APP_AGORA_APP_ID;
        if (!appId) {
          throw new Error('Agora App ID missing. Please check environment variables.');
        }

        const channel = accessData.room_id;
        const token = accessData.token;
        let uid = accessData.patient_user_id;

        if (!channel || !token) {
          throw new Error('Missing required video call data (channel or token)');
        }

        if (typeof uid === 'string') {
          uid = parseInt(uid, 10);
        }
        
        if (!uid || isNaN(uid)) {
          uid = 0;
          console.log('Using auto-assigned UID');
        }

        if (clientRef.current) {
          try {
            await clientRef.current.leave();
          } catch (e) {
            console.log('Error leaving existing client:', e);
          }
          clientRef.current = null;
        }

        clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        const client = clientRef.current;

        client.on('connection-state-change', (curState, revState) => {
          console.log('Connection state changed:', curState, 'from:', revState);
          setConnectionStatus(curState === 'CONNECTED' ? 'Connected' : 'Connecting...');
        });

        client.on('exception', (evt) => {
          console.error('Agora client exception:', evt);
        });

        client.on('user-published', async (user, mediaType) => {
          try {
            console.log('User published:', user.uid, mediaType);
            await client.subscribe(user, mediaType);
            
            if (mediaType === 'video' && remoteVideoRef.current) {
              user.videoTrack.play(remoteVideoRef.current);
              setDoctorConnected(true);
              console.log('Playing remote video for user:', user.uid);
            }
            if (mediaType === 'audio') {
              user.audioTrack.play();
              console.log('Playing remote audio for user:', user.uid);
            }
          } catch (subscribeError) {
            console.error('Error subscribing to user:', subscribeError);
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          console.log('User unpublished:', user.uid, mediaType);
          if (mediaType === 'video') {
            setDoctorConnected(false);
          }
        });

        client.on('user-left', (user) => {
          console.log('Doctor left the call:', user.uid);
          setDoctorConnected(false);
          
          showNotification('Doctor has left the consultation', 'info');
          
          setTimeout(() => {
            if (!isEndingCallRef.current) {
              endCall();
            }
          }, 2000);
        });

        console.log('Joining Agora channel:', channel, 'with UID:', uid);
        setConnectionStatus('Joining video call...');
        
        let joinAttempts = 0;
        const maxAttempts = 3;
        
        while (joinAttempts < maxAttempts) {
          try {
            const assignedUid = await client.join(appId, channel, token, uid);
            console.log('Successfully joined with UID:', assignedUid);
            hasJoinedRef.current = true;
            break;
          } catch (joinError) {
            joinAttempts++;
            console.error(`Join attempt ${joinAttempts} failed:`, joinError);
            
            if (joinError.code === 'UID_CONFLICT' && joinAttempts < maxAttempts) {
              console.log('UID conflict detected, trying with auto-assigned UID...');
              uid = 0;
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw joinError;
            }
          }
        }

        try {
          setConnectionStatus('Setting up camera and microphone...');
          localTracksRef.current.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: 'music_standard',
          });
          localTracksRef.current.videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: '480p_1',
          });
          
          await client.publish([localTracksRef.current.audioTrack, localTracksRef.current.videoTrack]);
          localTracksRef.current.videoTrack.play(localVideoRef.current);
          
          setCallStarted(true);
          setConnectionStatus('Call active');
          console.log('Patient successfully joined and published to channel:', channel);
        } catch (publishError) {
          console.error('Error publishing tracks:', publishError);
          throw new Error('Failed to initialize camera/microphone. Please check permissions.');
        }
      } catch (error) {
        console.error('Error initializing Agora call:', error);
        setError(error.message || 'Failed to initialize video call');
        setConnectionStatus('Connection failed');
      } finally {
        isJoiningRef.current = false;
      }
    };

    initAgoraCall();
  }, [accessData, navigate]);

  const cleanupVideoCall = async () => {
    console.log('Cleaning up video call resources');
    
    if (localTracksRef.current.audioTrack) {
      localTracksRef.current.audioTrack.stop();
      localTracksRef.current.audioTrack.close();
      localTracksRef.current.audioTrack = null;
    }
    if (localTracksRef.current.videoTrack) {
      localTracksRef.current.videoTrack.stop();
      localTracksRef.current.videoTrack.close();
      localTracksRef.current.videoTrack = null;
    }
    
    if (clientRef.current && hasJoinedRef.current) {
      const connectionState = clientRef.current.connectionState;
      if (connectionState === 'CONNECTED' || connectionState === 'CONNECTING') {
        await clientRef.current.leave();
      }
      clientRef.current = null;
    }
    
    hasJoinedRef.current = false;
  };

  const showNotification = (message, type = 'info') => {
    const notificationDiv = document.createElement('div');
    notificationDiv.innerHTML = message;
    notificationDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${type === 'info' ? 'linear-gradient(135deg, #3b82f6, #1e40af)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-size: 1.2rem;
      font-weight: 600;
      box-shadow: 0 15px 35px rgba(59, 130, 246, 0.3);
      z-index: 10000;
      max-width: 400px;
      text-align: center;
    `;
    
    document.body.appendChild(notificationDiv);
    
    setTimeout(() => {
      if (document.body.contains(notificationDiv)) {
        document.body.removeChild(notificationDiv);
      }
    }, 3000);
  };

  const endCall = async () => {
    if (isEndingCallRef.current) {
      console.log('Already ending call, skipping...');
      return;
    }

    isEndingCallRef.current = true;
    
    try {
      console.log('Ending call...');
      setConnectionStatus('Ending call...');
      
      await cleanupVideoCall();
      
      setCallStarted(false);
      setDoctorConnected(false);
      console.log('Call ended successfully, navigating to dashboard');
      
      const token = localStorage.getItem('token');
      if (token) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
      
    } catch (error) {
      console.error('Error ending call:', error);
      const token = localStorage.getItem('token');
      if (token) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } finally {
      isEndingCallRef.current = false;
    }
  };

  const handleSwapVideos = () => {
    setIsSwapped(!isSwapped);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (callStarted) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave the video call?';
      }
    };

    const handlePopState = () => {
      if (callStarted) {
        const confirmLeave = window.confirm('Are you sure you want to leave the video call?');
        if (confirmLeave) {
          endCall();
        } else {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    if (callStarted) {
      window.history.pushState(null, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [callStarted]);

  if (loading) {
    return (
      <div className="video-call-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Verifying access and preparing video call...</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{connectionStatus}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-call-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 style={{ color: '#e53e3e', margin: '0 0 10px 0' }}>Connection Error</h3>
          <p className="error-message">{error}</p>
          <button className="back-button" onClick={() => {
            const token = localStorage.getItem('token');
            if (token) {
              navigate('/dashboard');
            } else {
              navigate('/login');
            }
          }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-container">
      <div className="call-header">
        <h2>🩺 Secure Video Consultation</h2>
        <p><strong>Appointment ID:</strong> {appointmentId}</p>
        {accessData && (
          <>
            <p><strong>Room:</strong> {accessData.room_id}</p>
            <p style={{ color: '#48bb78', fontWeight: '600' }}>
              Status: {connectionStatus}
            </p>
            {doctorConnected && (
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                👨‍⚕️ Doctor is connected
              </p>
            )}
          </>
        )}
      </div>
      
      <div className="call-container">
        <div className="video-section">
          <div className="video-wrapper" style={{ order: isSwapped ? 2 : 1 }}>
            <h3>
              <span>👤 Your Video</span>
              <button className="swap-button" onClick={handleSwapVideos}>
                🔄 Swap
              </button>
            </h3>
            <div ref={localVideoRef} className="video-player"></div>
          </div>
          <div className="video-wrapper" style={{ order: isSwapped ? 1 : 2 }}>
            <h3>👨‍⚕️ Doctor's Video</h3>
            <div ref={remoteVideoRef} className="video-player">
              {!doctorConnected && (
                <div style={{
                  position: 'absolute',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  zIndex: 2
                }}>
                  Waiting for doctor to join...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {callStarted && (
        <div className="call-footer">
          <p className="call-status">Video consultation in progress</p>
          <button 
            className="end-call-button" 
            onClick={endCall}
            disabled={isEndingCallRef.current}
          >
            {isEndingCallRef.current ? '📞 Ending...' : '📞 End Call'}
          </button>
        </div>
      )}
    </div>
  );
}