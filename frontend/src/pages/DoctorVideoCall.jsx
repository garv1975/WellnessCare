import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import API from '../api';
import './DoctorVideoCall.css';

export default function DoctorVideoCall() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessData, setAccessData] = useState(null);
  const [callStarted, setCallStarted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [patientConnected, setPatientConnected] = useState(false);
  const [isCompletingAppointment, setIsCompletingAppointment] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const clientRef = useRef(null);
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null });
  const hasJoinedRef = useRef(false);
  const isEndingCallRef = useRef(false);

  useEffect(() => {
    console.log('DoctorVideoCall component mounted, appointmentId:', appointmentId);
    const doctorToken = localStorage.getItem('doctor_token');
    const doctorId = localStorage.getItem('doctor_id');

    if (!doctorToken || !doctorId) {
      console.log('No doctor token or ID found, redirecting to login');
      navigate('/doctor/login', { state: { from: `/doctor/video-call/${appointmentId}` } });
      return;
    }

    API.defaults.headers.common['Authorization'] = `Bearer ${doctorToken}`;

    const verifyAccess = async () => {
      try {
        console.log('Verifying doctor video access for appointment:', appointmentId);
        const response = await API.get(`/doctor/appointments/${appointmentId}/video-access`);
        console.log('Access data received:', response.data);
        setAccessData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Doctor video access error:', err.response || err);
        let errorMessage = err.response?.data?.msg || 'Failed to verify video call access';
        if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 422) {
          errorMessage = 'Unauthorized or invalid token. Please log in again.';
          localStorage.removeItem('doctor_token');
          localStorage.removeItem('doctor_id');
          localStorage.removeItem('doctor_role');
          localStorage.removeItem('doctor_info');
          navigate('/doctor/login');
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
        try {
          console.log('Cleaning up video call resources on unmount');
          if (!isEndingCallRef.current && hasJoinedRef.current) {
            await cleanupVideoCall();
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      };
      cleanup();
    };
  }, [appointmentId, navigate]);

  useEffect(() => {
    if (!accessData || !localVideoRef.current || !remoteVideoRef.current || hasJoinedRef.current || isJoining) {
      console.log('Skipping Agora initialization:', {
        accessData: !!accessData,
        localVideoRef: !!localVideoRef.current,
        remoteVideoRef: !!remoteVideoRef.current,
        hasJoined: hasJoinedRef.current,
        isJoining: isJoining
      });
      return;
    }

    const timer = setTimeout(() => {
      initAgoraCall();
    }, 100);

    return () => clearTimeout(timer);
  }, [accessData, isJoining]);

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
    setIsEndingCall(true);
    
    try {
      console.log('Ending call...');
      setConnectionStatus('disconnected');
      
      await cleanupVideoCall();
      
      setCallStarted(false);
      setPatientConnected(false);
      console.log('Call ended successfully, navigating to dashboard');
      
      const doctorToken = localStorage.getItem('doctor_token');
      if (doctorToken) {
        navigate('/doctor/dashboard', { replace: true });
      } else {
        navigate('/doctor/login', { replace: true });
      }
      
    } catch (error) {
      console.error('Error ending call:', error);
      const doctorToken = localStorage.getItem('doctor_token');
      if (doctorToken) {
        navigate('/doctor/dashboard', { replace: true });
      } else {
        navigate('/doctor/login', { replace: true });
      }
    } finally {
      isEndingCallRef.current = false;
      setIsEndingCall(false);
    }
  };

  const initAgoraCall = async () => {
    if (hasJoinedRef.current || isJoining) {
      console.log('Already joined or joining, skipping initialization');
      return;
    }

    try {
      setIsJoining(true);
      setConnectionStatus('connecting');
      console.log('Initializing Agora call for doctor');
      
      const appId = process.env.REACT_APP_AGORA_APP_ID;
      if (!appId) {
        throw new Error('Agora App ID missing. Please check environment variables.');
      }

      const channel = accessData.room_id;
      const token = accessData.token;
      let uid = accessData.doctor_user_id;

      if (!channel || !token) {
        throw new Error('Missing required video call data (channel or token)');
      }

      if (uid && typeof uid === 'string') {
        uid = parseInt(uid, 10);
        if (isNaN(uid)) {
          uid = null;
        }
      }

      if (!localVideoRef.current || !remoteVideoRef.current) {
        throw new Error('Video container elements not available');
      }

      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (e) {
          console.log('Previous client cleanup:', e.message);
        }
      }

      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      const client = clientRef.current;

      client.on('user-published', async (user, mediaType) => {
        try {
          console.log('User published:', user.uid, mediaType);
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && remoteVideoRef.current) {
            user.videoTrack.play(remoteVideoRef.current);
            setPatientConnected(true);
          }
          if (mediaType === 'audio') {
            user.audioTrack.play();
          }
          console.log('Patient joined:', user.uid);
        } catch (subscribeError) {
          console.error('Error subscribing to user:', subscribeError);
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        console.log('Patient unpublished:', user.uid, mediaType);
        if (mediaType === 'video') {
          setPatientConnected(false);
        }
      });

      client.on('user-left', (user) => {
        console.log('Patient left the call:', user.uid);
        setPatientConnected(false);
        
        showNotification('Patient has left the consultation', 'info');
        
        setTimeout(() => {
          if (!isEndingCallRef.current) {
            endCall();
          }
        }, 2000);
      });

      client.on('connection-state-change', (curState, revState) => {
        console.log('Connection state changed:', revState, '->', curState);
        setConnectionStatus(curState.toLowerCase());
      });

      client.on('exception', (evt) => {
        console.error('Agora exception:', evt);
      });

      console.log('Joining Agora channel:', channel, 'with UID:', uid);
      
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

      setConnectionStatus('connected');

      try {
        localTracksRef.current.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'music_standard',
        });
        localTracksRef.current.videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: '480p_1',
        });

        await client.publish([localTracksRef.current.audioTrack, localTracksRef.current.videoTrack]);
        console.log('Published local tracks');

        if (localTracksRef.current.videoTrack && localVideoRef.current) {
          localTracksRef.current.videoTrack.play(localVideoRef.current);
        }
        
        setCallStarted(true);
        console.log('Doctor successfully joined channel:', channel);
      } catch (trackError) {
        console.error('Error creating/publishing tracks:', trackError);
        setError('Failed to access camera/microphone: ' + trackError.message);
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      console.error('Agora initialization error:', err);
      hasJoinedRef.current = false;
      setConnectionStatus('disconnected');
      
      let errorMessage = 'Failed to initialize video call';
      if (err.code === 'UID_CONFLICT') {
        errorMessage = 'Connection conflict detected. Please refresh the page and try again.';
      } else if (err.code === 'INVALID_PARAMS') {
        errorMessage = 'Invalid connection parameters. Please check your appointment details.';
      } else if (err.code === 'INVALID_TOKEN') {
        errorMessage = 'Video call session has expired. Please refresh and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsJoining(false);
      setLoading(false);
    }
  };

  const handleCompleteAppointment = async () => {
    if (isCompletingAppointment) {
      return;
    }

    try {
      setIsCompletingAppointment(true);
      console.log('Marking appointment as complete:', appointmentId);
      
      const doctorToken = localStorage.getItem('doctor_token');
      if (!doctorToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      API.defaults.headers.common['Authorization'] = `Bearer ${doctorToken}`;
      
      await API.put(`/doctor/appointments/${appointmentId}/complete`);
      
      const successDiv = document.createElement('div');
      successDiv.innerHTML = '✅ Appointment completed successfully!';
      successDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 1.2rem;
        font-weight: 600;
        box-shadow: 0 15px 35px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        animation: successPop 0.6s ease-out;
      `;
      
      document.body.appendChild(successDiv);
      
      try {
        await cleanupVideoCall();
      } catch (cleanupError) {
        console.error('Cleanup error during completion:', cleanupError);
      }
      
      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv);
        }
        navigate('/doctor/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error('Complete appointment error:', err.response || err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Authentication error during appointment completion');
        localStorage.removeItem('doctor_token');
        localStorage.removeItem('doctor_id');
        localStorage.removeItem('doctor_role');
        localStorage.removeItem('doctor_info');
        navigate('/doctor/login');
      } else {
        const errorMessage = err.response?.data?.msg || err.message || 'Failed to complete appointment';
        setError(errorMessage);
        showNotification(`❌ ${errorMessage}`, 'error');
      }
    } finally {
      setIsCompletingAppointment(false);
    }
  };

  const handleRefreshCall = () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = '🔄 Refreshing call...';
    loadingDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(59, 130, 246, 0.95);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-size: 1.2rem;
      font-weight: 600;
      box-shadow: 0 15px 35px rgba(59, 130, 246, 0.3);
      z-index: 10000;
    `;
    
    document.body.appendChild(loadingDiv);
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleSwapVideos = () => {
    setIsSwapped(!isSwapped);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (callStarted && !isEndingCallRef.current) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave the video call?';
      }
    };

    const handlePopState = () => {
      if (callStarted && !isEndingCallRef.current) {
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

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: '🟢 Connected', class: 'connected' };
      case 'connecting':
        return { text: '🟡 Connecting...', class: 'connecting' };
      default:
        return { text: '🔴 Disconnected', class: 'disconnected' };
    }
  };

  const statusDisplay = getConnectionStatusDisplay();

  if (loading) {
    return (
      <div className="video-call-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>🔍 Verifying appointment access...</p>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Please wait while we prepare your consultation room
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-call-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="refresh-button" onClick={handleRefreshCall}>
              🔄 Refresh Call
            </button>
            <button className="back-button" onClick={() => navigate('/doctor/dashboard')}>
              🏠 Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-container" style={{ minHeight: '100vh' }}>
      <div className={`connection-status ${statusDisplay.class}`}>
        {statusDisplay.text}
      </div>

      <div className="call-header">
        <h2>🎥 Patient Consultation</h2>
        <p><strong>Appointment ID:</strong> {appointmentId}</p>
        {accessData && (
          <>
            <p><strong>Room:</strong> {accessData.room_id}</p>
            {patientConnected && (
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                👥 Patient is connected
              </p>
            )}
          </>
        )}
      </div>

      <div className="call-container">
        <div className="video-section">
          <div className="video-wrapper" style={{ order: isSwapped ? 2 : 1 }}>
            <h3>
              <span>👨‍⚕️ Your Video (Doctor)</span>
              <button className="swap-button" onClick={handleSwapVideos}>
                🔄 Swap
              </button>
            </h3>
            <div ref={localVideoRef} className="video-player"></div>
          </div>
          <div className="video-wrapper" style={{ order: isSwapped ? 1 : 2 }}>
            <h3>👤 Patient's Video</h3>
            <div ref={remoteVideoRef} className="video-player">
              {!patientConnected && (
                <div style={{
                  position: 'absolute',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  zIndex: 2
                }}>
                  Waiting for patient to join...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {callStarted && (
        <div className="call-footer">
          <button 
            className="end-call-button" 
            onClick={endCall}
            disabled={isEndingCall}
          >
            {isEndingCall ? '📞 Ending...' : '📞 End Call'}
          </button>
          <button 
            className={`complete-button ${isCompletingAppointment ? 'loading' : ''}`}
            onClick={handleCompleteAppointment}
            disabled={isCompletingAppointment || isEndingCall}
          >
            {isCompletingAppointment ? '⏳ Completing...' : '✅ Mark Consultation as Completed'}
          </button>
        </div>
      )}
    </div>
  );
}