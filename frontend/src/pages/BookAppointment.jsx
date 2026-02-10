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
        <h2 className="page-title">
          {isRescheduling ? 'Reschedule Your Appointment' : 'Book Your Appointment'}
        </h2>
        <p className="page-subtitle">
          Choose from our expert healthcare professionals
        </p>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="content-wrapper">
        <div className="doctors-section">
          <h3>Select a Doctor</h3>
          <div className="doctors-grid">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className={`doctor-card ${selectedDoctor?.id === doctor.id ? 'selected' : ''}`}
                onClick={() => handleDoctorSelect(doctor)}
              >
                <h4>{doctor.name}</h4>
                <p>{doctor.specialization}</p>
                <span>{doctor.availability}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedDoctor && (
          <form onSubmit={handleSubmit} className="booking-form">
            <label>
              Appointment Date & Time
              <input
                type="datetime-local"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
                min={minDateTime}
                disabled={loading}
              />
            </label>

            <label>
              Reason
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading
                ? 'Processing...'
                : isRescheduling
                  ? 'Reschedule Appointment'
                  : 'Book Appointment'
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
