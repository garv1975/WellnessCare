import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './DoctorLogin.css';

export default function DoctorLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Trigger fade-in animation after component mounts
  useEffect(() => {
    console.log('DoctorLogin component mounted'); // Debug log
    setIsVisible(true);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/doctor/login', formData);
      
      // Store doctor authentication data
      localStorage.setItem('doctor_token', response.data.token);
      localStorage.setItem('doctor_id', response.data.doctor_id);
      localStorage.setItem('doctor_role', 'doctor');
      localStorage.setItem('doctor_info', JSON.stringify(response.data.doctor_info));
      
      navigate('/doctor/dashboard');
    } catch (err) {
      console.error('Doctor login error:', err.response || err);
      setError(err.response?.data?.msg || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ minHeight: '100vh' }}>
      <div className="auth-wrapper">
        <div className={`auth-form fade-in ${isVisible ? 'visible' : ''}`}>
          <h2>Doctor Portal</h2>
          <p>Access your patient appointments and consultations</p>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="doctor@clinic.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className={`form-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Signing In...
                </>
              ) : (
                'Sign In to Doctor Portal'
              )}
            </button>
          </form>

          <div className="demo-credentials">
            <h4>Demo Credentials:</h4>
            <div className="credentials-list">
              <div>Email: doctor_rajesh@clinic.com | Password: doctor123</div>
              <div>Email: doctor_priya@clinic.com | Password: doctor123</div>
              <div>Email: doctor_amit@clinic.com | Password: doctor123</div>
              <div>Email: doctor_sunita@clinic.com | Password: doctor123</div>
            </div>
          </div>
        </div>
        <div className="auth-decorative">
          <h3>Welcome, Doctors!</h3>
          <p>Manage your appointments and connect with patients seamlessly.</p>
        </div>
      </div>
    </div>
  );
}