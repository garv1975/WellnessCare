import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './DoctorDashboard.css';

export default function DoctorDashboard() {
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  const fetchDoctorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      // Fetch doctor info
      const doctorResponse = await API.get('/doctor/me');
      setDoctorInfo(doctorResponse.data);

      // Fetch appointments
      const appointmentsResponse = await API.get('/doctor/appointments');
      setAppointments(appointmentsResponse.data);
      
    } catch (err) {
      console.error('Fetch error:', err.response || err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('doctor_token');
        localStorage.removeItem('doctor_id');
        localStorage.removeItem('doctor_role');
        navigate('/doctor/login');
      } else {
        setError(err.response?.data?.msg || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    console.log('DoctorDashboard component mounted'); // Debug log
    const doctorToken = localStorage.getItem('doctor_token');
    if (!doctorToken) {
      navigate('/doctor/login');
      return;
    }

    // Set up API interceptor for doctor requests
    API.defaults.headers.common['Authorization'] = `Bearer ${doctorToken}`;

    fetchDoctorData();
    setIsVisible(true); // Trigger fade-in animation

    // Set up polling to refresh appointments every 5 minutes
    const pollingInterval = setInterval(() => {
      console.log('Polling for updated doctor data and appointments');
      fetchDoctorData();
    }, 5 * 60 * 1000); // 5 minutes

    // Cleanup polling interval on unmount
    return () => clearInterval(pollingInterval);
  }, [navigate, fetchDoctorData]);

  const handleJoinVideoCall = (appointmentId) => {
    navigate(`/doctor/video-call/${appointmentId}`);
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await API.put(`/doctor/appointments/${appointmentId}/complete`);
      // Refresh appointments
      await fetchDoctorData();
      alert('Appointment marked as completed');
    } catch (err) {
      console.error('Complete appointment error:', err);
      alert(err.response?.data?.msg || 'Failed to complete appointment');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor_id');
    localStorage.removeItem('doctor_role');
    localStorage.removeItem('doctor_info');
    navigate('/doctor/login');
  };

  const formatDateTime = (timeString) => {
    try {
      if (!timeString) {
        return { date: 'No Date', time: 'No Time' };
      }
      
      const date = new Date(timeString.replace(' ', 'T'));
      
      if (isNaN(date.getTime())) {
        return { date: 'Invalid Date', time: 'Invalid Time' };
      }
      
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch (error) {
      console.error('Date formatting error:', error);
      return { date: 'Invalid Date', time: 'Invalid Time' };
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <button onClick={fetchDoctorData} className="card-action-btn secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Safe filtering with null checks
  const todayAppointments = appointments.filter(apt => apt && apt.is_today) || [];
  const upcomingAppointments = appointments.filter(apt => apt && !apt.is_today) || [];
  const currentAppointments = appointments.filter(apt => apt && apt.is_current) || [];

  return (
    <div className={`dashboard-container ${isVisible ? 'fade-in' : ''}`} style={{ minHeight: '100vh' }}>
      <header className="dashboard-header">
        <div className="header-content">
          <div className="doctor-info">
            <div className="doctor-avatar">👨‍⚕️</div>
            <div>
              <h1 className="dashboard-title">Welcome, {doctorInfo?.name || 'Doctor'}</h1>
              <p className="dashboard-subtitle">{doctorInfo?.specialization || 'General'}</p>
              <p className="dashboard-subtitle">{doctorInfo?.availability || 'Available'}</p>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="card-action-btn danger">
          Logout
        </button>
      </header>

      <div>
        {/* Current/Active Appointments */}
        {currentAppointments.length > 0 && (
          <section className="appointments-section">
            <div className="section-header">
              <h3>🔴 Active Consultations</h3>
              <span className="appointment-count">{currentAppointments.length}</span>
            </div>
            <div className="appointments-grid">
              {currentAppointments.map(appointment => {
                if (!appointment || !appointment.id) return null;
                
                const { date, time } = formatDateTime(appointment.time);
                return (
                  <div key={appointment.id} className="appointment-card">
                    <div className="card-header">
                      <div className="doctor-info">
                        <h4>Patient: {appointment.patient_email || 'Unknown'}</h4>
                        <div>
                          <span className="date">{date}</span>
                          <span className="time">{time}</span>
                        </div>
                      </div>
                      <div className="status-badge status-current">ACTIVE</div>
                    </div>
                    <div className="card-body">
                      <div className="reason-container">
                        <span className="reason-label">Reason</span>
                        <p className="appointment-reason">{appointment.reason || 'General consultation'}</p>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button
                        onClick={() => handleJoinVideoCall(appointment.id)}
                        className="card-action-btn"
                      >
                        🎥 Join Video Call
                      </button>
                      <button
                        onClick={() => handleCompleteAppointment(appointment.id)}
                        className="card-action-btn secondary"
                      >
                        ✅ Mark Complete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Today's Appointments */}
        <section className="appointments-section">
          <div className="section-header">
            <h3>📅 Today's Appointments</h3>
            <span className="appointment-count">{todayAppointments.length}</span>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No Appointments</h3>
              <p>No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="appointments-grid">
              {todayAppointments.map(appointment => {
                if (!appointment || !appointment.id) return null;
                
                const { date, time } = formatDateTime(appointment.time);
                const canJoinVideo = appointment.is_current;
                
                return (
                  <div key={appointment.id} className="appointment-card">
                    <div className="card-header">
                      <div className="doctor-info">
                        <h4>Patient: {appointment.patient_email || 'Unknown'}</h4>
                        <div>
                          <span className="date">{date}</span>
                          <span className="time">{time}</span>
                        </div>
                      </div>
                      <div className={`status-badge status-${appointment.status?.toLowerCase() || 'unknown'}`}>
                        {appointment.status || 'UNKNOWN'}
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="reason-container">
                        <span className="reason-label">Reason</span>
                        <p className="appointment-reason">{appointment.reason || 'General consultation'}</p>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button
                        onClick={() => handleJoinVideoCall(appointment.id)}
                        className={`card-action-btn ${canJoinVideo ? '' : 'disabled'}`}
                        disabled={!canJoinVideo}
                        title={canJoinVideo ? 'Join video call' : 'Video call available 5 minutes before appointment'}
                      >
                        🎥 {canJoinVideo ? 'Join Video Call' : 'Video Call (Not Ready)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <section className="appointments-section">
            <div className="section-header">
              <h3>📋 Upcoming Appointments</h3>
              <span className="appointment-count">{upcomingAppointments.length}</span>
            </div>
            <div className="appointments-grid">
              {upcomingAppointments.slice(0, 5).map(appointment => {
                if (!appointment || !appointment.id) return null;
                
                const { date, time } = formatDateTime(appointment.time);
                return (
                  <div key={appointment.id} className="appointment-card">
                    <div className="card-header">
                      <div className="doctor-info">
                        <h4>Patient: {appointment.patient_email || 'Unknown'}</h4>
                        <div>
                          <span className="date">{date}</span>
                          <span className="time">{time}</span>
                        </div>
                      </div>
                      <div className={`status-badge status-${appointment.status?.toLowerCase() || 'unknown'}`}>
                        {appointment.status || 'UNKNOWN'}
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="reason-container">
                        <span className="reason-label">Reason</span>
                        <p className="appointment-reason">{appointment.reason || 'General consultation'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}