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

  // ---- local "now" for datetime-local min ----
  const nowLocal = new Date();
  nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
  const minDateTime = nowLocal.toISOString().slice(0, 16);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchDoctors = async () => {
      try {
        const response = await API.get('/doctors');
        setDoctors(response.data);

        // -------- Rescheduling prefill --------
        if (location.state?.doctorId) {
          const doctor = response.data.find(d => d.id === location.state.doctorId);
          if (doctor) {
            setSelectedDoctor(doctor);

            let timeValue = '';
            if (location.state.time) {
              try {
                const date = new Date(location.state.time);

                // UTC → LOCAL for datetime-local input
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                timeValue = date.toISOString().slice(0, 16);
              } catch (e) {
                console.error('Time parse error:', e);
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
        setError(err.response?.data?.msg || 'Failed to fetch doctors');
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };

    fetchDoctors();
  }, [navigate, location.state]);

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
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
      // -------- LOCAL → UTC CONVERSION (KEY FIX) --------
      const localDate = new Date(formData.time);

      if (localDate < new Date()) {
        throw new Error('Cannot book appointments in the past');
      }

      const utcISOString = localDate.toISOString(); // UTC
      const timeFormatted = utcISOString.slice(0, 16).replace('T', ' ');

      const payload = {
        doctor_id: selectedDoctor.id,
        time: timeFormatted,
        reason: formData.reason.trim()
      };

      if (isRescheduling) {
        await API.put(
          `/appointments/${location.state.appointmentId}`,
          { time: timeFormatted }
        );
      } else {
        await API.post('/appointments/book', payload);
      }

      alert(isRescheduling
        ? 'Appointment rescheduled successfully!'
        : 'Appointment booked successfully!'
      );

      navigate('/dashboard', { state: { refresh: true } });

    } catch (err) {
      let msg = isRescheduling
        ? 'Rescheduling failed. Please try again.'
        : 'Booking failed. Please try again.';

      if (err.message === 'Cannot book appointments in the past') {
        msg = err.message;
      } else if (err.response) {
        msg = err.response.data?.msg || msg;
        if (err.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
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