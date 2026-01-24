import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChatbotContext } from '../App';
import API from '../api';
import './Navbar.css';

export default function Navbar({ toggleSidebar }) {
  const { setChatbotOpen } = useContext(ChatbotContext);
  const navigate = useNavigate();
  const patientToken = localStorage.getItem('token');
  const doctorToken = localStorage.getItem('doctor_token');
  const doctorRole = localStorage.getItem('doctor_role');
  const isPatientLoggedIn = !!patientToken && !doctorRole;
  const isDoctorLoggedIn = !!doctorToken && doctorRole === 'doctor';
  const isLoggedIn = isPatientLoggedIn || isDoctorLoggedIn;

  console.log('Navbar state:', { isPatientLoggedIn, isDoctorLoggedIn, isLoggedIn, doctorRole }); // Debug log

  const handleLogout = async () => {
    console.log('Initiating logout...'); // Debug log
    try {
      await API.post('/auth/logout');
      clearLocalStorage();
      setChatbotOpen(false);
      navigate('/login');
      alert('Logged out successfully!');
    } catch (err) {
      console.error('Logout error:', err);
      clearLocalStorage();
      setChatbotOpen(false);
      navigate('/login');
      alert('Logged out, but there was an issue contacting the server.');
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor_id');
    localStorage.removeItem('doctor_role');
    localStorage.removeItem('doctor_info');
  };

  const handleBookAppointment = () => {
    console.log('Book Appointment clicked, isLoggedIn:', isLoggedIn); // Debug log
    if (isLoggedIn) {
      navigate('/book-appointment');
    } else {
      navigate('/login', { state: { from: { pathname: '/book-appointment' } } });
    }
  };

  const handleDashboardClick = (e) => {
    console.log('Dashboard clicked, isLoggedIn:', isLoggedIn, 'doctorRole:', doctorRole); // Debug log
    if (!isLoggedIn) {
      e.preventDefault();
      navigate('/login', { state: { from: { pathname: isDoctorLoggedIn ? '/doctor/dashboard' : '/dashboard' } } });
    } else if (isDoctorLoggedIn) {
      navigate('/doctor/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handlePatientLogin = () => {
    console.log('Patient Login clicked'); // Debug log
    clearLocalStorage();
    navigate('/login');
  };

  const handleDoctorLogin = () => {
    console.log('Doctor Login clicked'); // Debug log
    clearLocalStorage();
    navigate('/doctor/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">WellnessCare</Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/about">About</Link></li>
        <li><Link to="/services">Services</Link></li>
        <li><Link to="/faqs">FAQs</Link></li>
        {isLoggedIn ? (
          <>
            <li>
              <Link
                to={isDoctorLoggedIn ? '/doctor/dashboard' : '/dashboard'}
                onClick={handleDashboardClick}
              >
                {isDoctorLoggedIn ? 'Doctor Dashboard' : 'Dashboard'}
              </Link>
            </li>
            <li>
              <button onClick={handleLogout} className="navbar-button desktop-only">
                Logout
              </button>
            </li>
            <li>
              <button
                onClick={toggleSidebar}
                className="navbar-hamburger mobile-only"
                aria-label="Toggle Sidebar"
              >
                <svg className="hamburger-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <button onClick={handlePatientLogin} className="navbar-button login-button">
                Log In as Patient
              </button>
            </li>
            <li>
              <button onClick={handleDoctorLogin} className="navbar-button login-button">
                Log In as Doctor
              </button>
            </li>
          </>
        )}
      </ul>
      <button onClick={handleBookAppointment} className="book-appointment-btn">
        <span className="btn-text">Book Appointment</span>
        <span className="btn-icon">📅</span>
        <div className="btn-particles">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
    </nav>
  );
}