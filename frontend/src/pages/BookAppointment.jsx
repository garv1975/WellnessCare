import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import './BookAppointment.css';

export default function BookAppointment() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({ time: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isRescheduling = !!location.state?.appointmentId;

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Initial token check:', token);
    if (!token) {
      console.log('No token found, redirecting to login...');
      navigate('/login');
      return;
    }

    const fetchDoctors = async () => {
      try {
        console.log('Fetching doctors...');
        const token = localStorage.getItem('token');
        console.log('Token for fetching doctors:', token);
        const response = await API.get('/doctors');
        console.log('Doctors fetched:', response.data);
        setDoctors(response.data);

        // Handle rescheduling: pre-select doctor and populate form
        if (location.state?.doctorId) {
          const doctor = response.data.find(d => d.id === location.state.doctorId);
          if (doctor) {
            setSelectedDoctor(doctor);
            // Convert the time back to datetime-local format for the input
            let timeValue = '';
            if (location.state.time) {
              try {
                // Parse the time string and convert to local datetime-local format
                const timeStr = location.state.time;
                let date;
                
                // Handle different possible formats
                if (timeStr.includes('T')) {
                  date = new Date(timeStr);
                } else {
                  // Assume format is "YYYY-MM-DD HH:mm"
                  date = new Date(timeStr.replace(' ', 'T'));
                }
                
                // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
                if (!isNaN(date.getTime())) {
                  timeValue = date.toISOString().slice(0, 16);
                }
              } catch (error) {
                console.error('Error parsing existing time:', error);
              }
            }
            
            setFormData({
              time: timeValue,
              reason: location.state.reason || ''
            });
            setIsFormVisible(true);
          }
        }
      } catch (err) {
        const errorMsg = err.response?.data?.msg || 'Failed to fetch doctors';
        setError(errorMsg);
        console.error('Fetch doctors error:', err.response || err);
        if (err.response?.status === 401 || err.response?.status === 422) {
          console.log('Unauthorized while fetching doctors, redirecting to login...');
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };
    fetchDoctors();
  }, [navigate, location.state]);

  useEffect(() => {
    console.log('Selected doctor updated:', selectedDoctor);
  }, [selectedDoctor]);

  const handleDoctorSelect = (doctor) => {
    console.log('Doctor clicked:', doctor);
    setSelectedDoctor({ ...doctor });
    setFormData({ time: '', reason: '' });
    setError('');
    setIsFormVisible(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting form submission...');
      const selectedTime = new Date(formData.time);
      
      // Format time to match what your backend expects
      // Keep it in local time format: YYYY-MM-DD HH:mm
      const year = selectedTime.getFullYear();
      const month = String(selectedTime.getMonth() + 1).padStart(2, '0');
      const day = String(selectedTime.getDate()).padStart(2, '0');
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      
      const timeFormatted = `${year}-${month}-${day} ${hours}:${minutes}`;
      console.log('Formatted time:', timeFormatted);

      const now = new Date();
      console.log('Current time:', now);
      if (selectedTime < now) {
        throw new Error('Cannot book appointments in the past');
      }

      const dataToSend = {
        doctor_id: selectedDoctor.id,
        time: timeFormatted,
        reason: formData.reason.trim()
      };
      console.log('Submitting data:', dataToSend);

      let response;
      if (isRescheduling) {
        console.log('Rescheduling appointment ID:', location.state.appointmentId);
        response = await API.put(`/appointments/${location.state.appointmentId}`, { time: timeFormatted });
      } else {
        response = await API.post('/appointments/book', dataToSend);
      }
      
      console.log('Response:', response.data);
      console.log('Status:', response.status);
      alert(isRescheduling ? 'Appointment rescheduled successfully!' : 'Appointment booked successfully!');
      navigate('/dashboard', { state: { refresh: true } });
      console.log('Navigated to dashboard');
    } catch (err) {
      console.error('Submission error:', err.response || err);
      let errorMessage = isRescheduling ? 'Rescheduling failed. Please try again.' : 'Booking failed. Please try again.';
      if (err.message === 'Cannot book appointments in the past') {
        errorMessage = err.message;
      } else if (err.response) {
        if (err.response.status === 401 || err.response.status === 422) {
          errorMessage = 'Unauthorized. Please log in again.';
          console.log('Unauthorized during submission, redirecting to login...');
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          errorMessage = err.response.data?.msg || errorMessage;
        }
      }
      setError(errorMessage);
      console.log('Error set to:', errorMessage);
    } finally {
      setLoading(false);
      console.log('Submission complete, loading set to false');
    }
  };

  return (
    <div className="book-appointment-container">
      <div className="header-section">
        <h2 className="page-title">{isRescheduling ? 'Reschedule Your Appointment' : 'Book Your Appointment'}</h2>
        <p className="page-subtitle">Choose from our expert healthcare professionals</p>
      </div>

      {error && (
        <div className="error-message slide-down">
          <div className="error-icon">⚠️</div>
          <span>{error}</span>
        </div>
      )}

      <div className="content-wrapper">
        <div className="doctors-section">
          <h3 className="section-title">Select a Doctor</h3>
          <div className="doctors-grid">
            {doctors.length === 0 && !error && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading our expert doctors...</p>
              </div>
            )}
            {doctors.map((doctor, index) => (
              <div
                key={doctor.id}
                className={`doctor-card ${selectedDoctor?.id === doctor.id ? 'selected' : ''}`}
                onClick={() => handleDoctorSelect(doctor)}
                onKeyDown={(e) => e.key === 'Enter' && handleDoctorSelect(doctor)}
                role="button"
                tabIndex={0}
                aria-label={`Select ${doctor.name}, ${doctor.specialization}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="doctor-avatar">
                  <span className="avatar-icon">👨‍⚕️</span>
                </div>
                <div className="doctor-info">
                  <h4 className="doctor-name">{doctor.name}</h4>
                  <p className="doctor-specialization">{doctor.specialization}</p>
                  <div className="availability-badge">
                    <span className="availability-dot"></span>
                    {doctor.availability}
                  </div>
                </div>
                <div className="selection-indicator">
                  <div className="checkmark">✓</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`form-section ${isFormVisible ? 'visible' : ''}`}>
          {selectedDoctor ? (
            <div className="appointment-form">
              <div className="form-header">
                <h3>{isRescheduling ? `Reschedule with Dr. ${selectedDoctor.name}` : `Schedule with Dr. ${selectedDoctor.name}`}</h3>
                <div className="selected-doctor-info">
                  <span className="specialization-tag">{selectedDoctor.specialization}</span>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="booking-form">
                <div className="form-group">
                  <label htmlFor="time">
                    <span className="label-icon">📅</span>
                    Appointment Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    aria-label="Appointment Time"
                    disabled={loading}
                    min={new Date().toISOString().slice(0, 16)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reason">
                    <span className="label-icon">📝</span>
                    Reason for Visit
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    placeholder="Please describe your symptoms or reason for the visit..."
                    value={formData.reason}
                    onChange={handleChange}
                    required
                    aria-label="Reason for Visit"
                    disabled={loading}
                    className="form-textarea"
                  />
                </div>

                <button 
                  type="submit" 
                  className={`submit-button ${loading ? 'loading' : ''}`} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="button-spinner"></div>
                      {isRescheduling ? 'Rescheduling Appointment...' : 'Booking Appointment...'}
                    </>
                  ) : (
                    <>
                      <span className="button-icon">📋</span>
                      {isRescheduling ? 'Reschedule Appointment' : 'Book Appointment'}
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="select-doctor-prompt">
              <div className="prompt-icon">👆</div>
              <h3>Select a Doctor</h3>
              <p>Choose from our qualified healthcare professionals above to schedule your appointment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}