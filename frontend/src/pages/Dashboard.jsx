import React, { useEffect, useState, useCallback, useContext } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatbotContext } from '../App';
import API from "../api.js";
import { format } from 'date-fns';
import "./Dashboard.css";

export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const navigate = useNavigate();
  const location = useLocation();
  const { setChatbotOpen } = useContext(ChatbotContext);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Token for fetchAppointments:', token);
      if (!token) {
        throw new Error('No token found');
      }
      const response = await API.get("/appointments/my");
      console.log('Appointments fetched:', response.data);
      setAppointments(response.data);
      setError('');
    } catch (err) {
      console.error("Dashboard fetch error:", err.response || err);
      if (err.message === 'No token found' || err.response?.status === 401 || err.response?.status === 422) {
        setError('Unauthorized. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        navigate('/login');
      } else {
        setError(err.response?.data?.msg || "Failed to fetch appointments");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchReminders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token for fetchReminders:', token);
      if (!token) {
        throw new Error('No token found');
      }
      const response = await API.get("/reminders/my");
      console.log('Reminders fetched:', response.data);
      setReminders(response.data);
      setError('');
    } catch (err) {
      console.error("Reminder fetch error:", err.response || err);
      if (err.message === 'No token found' || err.response?.status === 401 || err.response?.status === 422) {
        setError('Unauthorized. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        navigate('/login');
      } else {
        setError(err.response?.data?.msg || "Failed to fetch reminders");
      }
    }
  }, [navigate]);

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      setLoading(true);
      console.log('Cancelling appointment ID:', appointmentId);
      const response = await API.delete(`/appointments/${appointmentId}`);
      console.log('Cancel response:', response.data);
      alert('Appointment cancelled successfully!');
      fetchAppointments();
    } catch (err) {
      console.error('Cancel appointment error:', err.response || err);
      let errorMessage = err.response?.data?.msg || 'Failed to cancel appointment';
      if (err.response?.status === 401 || err.response?.status === 422) {
        errorMessage = 'Unauthorized. Please log in again.';
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        navigate('/login');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to permanently delete this appointment?')) {
      return;
    }

    try {
      setLoading(true);
      console.log('Deleting appointment ID:', appointmentId);
      const response = await API.delete(`/appointments/${appointmentId}/delete`);
      console.log('Delete response:', response.data);
      alert('Appointment deleted successfully!');
      fetchAppointments();
    } catch (err) {
      console.error('Delete appointment error:', err.response || err);
      let errorMessage = err.response?.data?.msg || 'Failed to delete appointment';
      if (err.response?.status === 401 || err.response?.status === 422) {
        errorMessage = 'Unauthorized. Please log in again.';
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        navigate('/login');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      setLoading(true);
      console.log('Deleting reminder ID:', reminderId);
      const response = await API.delete(`/reminders/${reminderId}`);
      console.log('Delete reminder response:', response.data);
      alert('Reminder deleted successfully!');
      fetchReminders();
    } catch (err) {
      console.error('Delete reminder error:', err.response || err);
      let errorMessage = err.response?.data?.msg || 'Failed to delete reminder';
      if (err.response?.status === 401 || err.response?.status === 422) {
        errorMessage = 'Unauthorized. Please log in again.';
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        navigate('/login');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleAppointment = (appointment) => {
    console.log('Rescheduling appointment:', appointment);
    navigate('/book-appointment', {
      state: {
        appointmentId: appointment.id,
        doctorId: appointment.doctor_id,
        time: appointment.time,
        reason: appointment.reason
      }
    });
  };

  const handleJoinVideoCall = (appointmentId) => {
    console.log('Joining video call for appointment ID:', appointmentId);
    navigate(`/video-call/${appointmentId}`);
  };

  const handleFilterChange = (event) => {
    setAppointmentFilter(event.target.value);
  };

  const getFilteredAppointments = () => {
    if (appointmentFilter === "all") {
      return appointments;
    }
    return appointments.filter(appointment => {
      const status = appointment.status?.toLowerCase();
      if (appointmentFilter === "scheduled") {
        return status === "scheduled" || status === "confirmed" || status === "pending";
      }
      if (appointmentFilter === "completed") {
        return status === "completed";
      }
      return true;
    });
  };

  useEffect(() => {
    console.log('useEffect triggered, refresh state:', location.state?.refresh);
    const token = localStorage.getItem('token');
    console.log('Initial token check:', token);
    if (!token) {
      navigate('/login');
    } else {
      fetchAppointments();
      fetchReminders();
      if (location.state?.showOnboardingPrompt) {
        setChatbotOpen(true);
        setTimeout(() => {
          API.post('/chatbot', { message: 'onboard', user_id: localStorage.getItem('user_id') })
            .then(response => console.log('Onboarding prompt sent:', response.data))
            .catch(err => console.error('Onboarding prompt error:', err));
        }, 1000);
      }
    }

    // Set up polling to refresh appointments every 5 minutes
    const pollingInterval = setInterval(() => {
      console.log('Polling for updated appointments and reminders');
      fetchAppointments();
      fetchReminders();
    }, 5 * 60 * 1000); // 5 minutes

    setTimeout(() => setFadeIn(true), 100);

    // Cleanup polling interval on unmount
    return () => clearInterval(pollingInterval);
  }, [navigate, location.state, fetchAppointments, fetchReminders, setChatbotOpen]);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchAppointments();
      fetchReminders();
    }
  }, [location.state, fetchAppointments, fetchReminders]);

  const LoadingSpinner = () => (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p className="loading-text">Loading your data...</p>
    </div>
  );

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-pending';
    }
  };

  const formatAppointmentTime = (timeString) => {
    try {
      console.log('Formatting time string:', timeString);
      
      let date;
      
      // Handle different possible time formats from the backend
      if (timeString.includes('T')) {
        // ISO format: "2025-06-09T10:00:00" or "2025-06-09T10:00:00Z"
        date = new Date(timeString);
      } else if (timeString.includes(' ')) {
        // Format: "2025-06-09 10:00" or "2025-06-09 10:00:00"
        // Treat as local time by adding 'T' instead of parsing directly
        date = new Date(timeString.replace(' ', 'T'));
      } else {
        // Fallback: try direct parsing
        date = new Date(timeString);
      }
      
      console.log('Parsed date object:', date);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date parsed from:', timeString);
        return timeString; // Return original string if parsing fails
      }
      
      // Format to user-friendly string
      const formatted = format(date, 'MMM dd, yyyy, h:mm a');
      console.log('Formatted time:', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting time:', error, 'Original string:', timeString);
      return timeString; // Fallback to original string if parsing fails
    }
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className={`dashboard-container ${fadeIn ? 'fade-in' : ''}`}>
      <div className="dashboard-header">
        <div className="header-content">
          <h2 className="dashboard-title">Your Health Dashboard</h2>
          <p className="dashboard-subtitle">Manage your appointments and health journey</p>
        </div>
        <button
          className="book-appointment-btn"
          onClick={() => navigate('/book-appointment')}
        >
          <span className="btn-icon">+</span>
          Book New Appointment
        </button>
      </div>

      {loading && <LoadingSpinner />}

      {error && (
        <div className="error-container slide-down">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
        </div>
      )}

      {!loading && !error && appointments.length === 0 && reminders.length === 0 && (
        <div className="empty-state slide-up">
          <div className="empty-icon">📅</div>
          <h3>No appointments or reminders yet</h3>
          <p>Start your health journey by booking an appointment or setting a reminder</p>
          <button
            className="empty-state-btn"
            onClick={() => navigate('/book-appointment')}
          >
            Book Your First Appointment
          </button>
        </div>
      )}

      {!loading && !error && reminders.length > 0 && (
        <div className="reminders-section slide-up">
          <div className="section-header">
            <h3>Your Reminders</h3>
            <span className="reminder-count">{reminders.length} reminder{reminders.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="reminders-grid">
            {reminders.map((reminder, index) => (
              <div
                key={reminder.id}
                className="reminder-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="card-header">
                  <div className="reminder-info">
                    <div className="reminder-icon">💼</div>
                    <div>
                      <h4 className="reminder-medication">{reminder.medication}</h4>
                      <p className="reminder-time">Daily at {reminder.time}</p>
                    </div>
                  </div>
                </div>
                <div className="card-footer">
                  <button
                    className="card-action-btn danger"
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    Delete Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && appointments.length > 0 && (
        <div className="appointments-section slide-up">
          <div className="section-header">
            <div className="section-title-container">
              <h3>Your Appointments</h3>
              <span className="appointment-count">{filteredAppointments.length} of {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="filter-container">
              <label htmlFor="appointment-filter" className="filter-label">Filter by status:</label>
              <select
                id="appointment-filter"
                value={appointmentFilter}
                onChange={handleFilterChange}
                className="appointment-filter-dropdown"
              >
                <option value="all">All Appointments</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="appointments-grid">
            {filteredAppointments.map((appointment, index) => (
              <div
                key={appointment.id}
                className="appointment-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="card-header">
                  <div className="doctor-info">
                    <div className="doctor-avatar">
                      {appointment.doctor_name?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div>
                      <h4 className="doctor-name">{appointment.doctor_name}</h4>
                      <p className="appointment-time">{formatAppointmentTime(appointment.time)}</p>
                    </div>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
                <div className="card-body">
                  <div className="reason-container">
                    <span className="reason-label">Reason for visit:</span>
                    <p className="appointment-reason">{appointment.reason}</p>
                  </div>
                </div>
                <div className="card-footer">
                  <button
                    className="card-action-btn secondary"
                    onClick={() => handleRescheduleAppointment(appointment)}
                    disabled={appointment.status !== 'Scheduled'}
                  >
                    Reschedule
                  </button>
                  {appointment.status === 'Cancelled' ? (
                    <button
                      className="card-action-btn danger"
                      onClick={() => handleDeleteAppointment(appointment.id)}
                    >
                      Delete Appointment
                    </button>
                  ) : (
                    <>
                      <button
                        className="card-action-btn primary"
                        onClick={() => handleJoinVideoCall(appointment.id)}
                        disabled={appointment.status !== 'Scheduled'}
                      >
                        Join Video Call
                      </button>
                      <button
                        className="card-action-btn danger"
                        onClick={() => handleCancelAppointment(appointment.id)}
                        disabled={appointment.status !== 'Scheduled'}
                      >
                        Cancel Appointment
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredAppointments.length === 0 && appointmentFilter !== "all" && (
            <div className="no-filtered-results">
              <p>No {appointmentFilter} appointments found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}