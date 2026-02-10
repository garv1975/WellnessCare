import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChatbotContext } from '../App';
import API from '../api';
import './Navbar.css';

export default function Navbar() {
  const { setChatbotOpen } = useContext(ChatbotContext);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const patientToken = localStorage.getItem('token');
  const doctorToken = localStorage.getItem('doctor_token');
  const doctorRole = localStorage.getItem('doctor_role');
  const isPatientLoggedIn = !!patientToken && !doctorRole;
  const isDoctorLoggedIn = !!doctorToken && doctorRole === 'doctor';
  const isLoggedIn = isPatientLoggedIn || isDoctorLoggedIn;

  console.log('Navbar state:', { isPatientLoggedIn, isDoctorLoggedIn, isLoggedIn, doctorRole });

  const handleLogout = async () => {
    console.log('Initiating logout...');
    try {
      await API.post('/auth/logout');
      clearLocalStorage();
      setChatbotOpen(false);
      setIsMobileMenuOpen(false);
      navigate('/login');
      alert('Logged out successfully!');
    } catch (err) {
      console.error('Logout error:', err);
      clearLocalStorage();
      setChatbotOpen(false);
      setIsMobileMenuOpen(false);
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
    console.log('Book Appointment clicked, isLoggedIn:', isLoggedIn);
    setIsMobileMenuOpen(false);
    if (isLoggedIn) {
      navigate('/book-appointment');
    } else {
      navigate('/login', { state: { from: { pathname: '/book-appointment' } } });
    }
  };

  const handleDashboardClick = (e) => {
    console.log('Dashboard clicked, isLoggedIn:', isLoggedIn, 'doctorRole:', doctorRole);
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
    console.log('Patient Login clicked');
    clearLocalStorage();
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const handleDoctorLogin = () => {
    console.log('Doctor Login clicked');
    clearLocalStorage();
    setIsMobileMenuOpen(false);
    navigate('/doctor/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/" onClick={closeMobileMenu}>WellnessCare</Link>
        </div>

        {/* Desktop Navigation */}
        <ul className="navbar-links desktop-nav">
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
                <button onClick={handleLogout} className="navbar-button logout-button">
                  Logout
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

        {/* Mobile Hamburger Menu */}
        <button
          className={`hamburger-menu ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <div className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        {/* Book Appointment Button - Desktop */}
        <button onClick={handleBookAppointment} className="book-appointment-btn desktop-only">
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

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      ></div>

      {/* Mobile Menu Sidebar */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-header">
          <div className="mobile-menu-logo">
            <Link to="/" onClick={closeMobileMenu}>WellnessCare</Link>
          </div>
          <button
            className="mobile-menu-close"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div className="mobile-menu-content">
          {/* Book Appointment Button - Mobile (at top) */}
          <button onClick={handleBookAppointment} className="mobile-book-btn">
            <span>📅</span>
            <span>Book Appointment</span>
          </button>
          
          <ul className="mobile-menu-links">
            <li>
              <Link to="/" onClick={closeMobileMenu}>Home</Link>
            </li>
            <li>
              <Link to="/about" onClick={closeMobileMenu}>About</Link>
            </li>
            <li>
              <Link to="/services" onClick={closeMobileMenu}>Services</Link>
            </li>
            <li>
              <Link to="/faqs" onClick={closeMobileMenu}>FAQs</Link>
            </li>
            {isLoggedIn && (
              <li>
                <Link
                  to={isDoctorLoggedIn ? '/doctor/dashboard' : '/dashboard'}
                  onClick={(e) => {
                    handleDashboardClick(e);
                    closeMobileMenu();
                  }}
                >
                  {isDoctorLoggedIn ? 'Doctor Dashboard' : 'Dashboard'}
                </Link>
              </li>
            )}
            {!isLoggedIn && (
              <>
                <li>
                  <button onClick={handlePatientLogin} className="mobile-login-btn">
                    Log In as Patient
                  </button>
                </li>
                <li>
                  <button onClick={handleDoctorLogin} className="mobile-login-btn">
                    Log In as Doctor
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
        
        {/* Logout Button at Bottom - Only shown when logged in */}
        {isLoggedIn && (
          <div className="mobile-menu-footer">
            <button onClick={handleLogout} className="mobile-logout-btn-footer">
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}