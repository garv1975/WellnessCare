import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { ChatbotContext } from '../App';
import API from '../api';
import './Login.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { setChatbotOpen } = useContext(ChatbotContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/login', {
        email: formData.email.trim(),
        password: formData.password
      });

      console.log('Login response:', response.data);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', response.data.user_id);
      console.log('Token stored:', response.data.token);
      console.log('User ID stored:', response.data.user_id);

      setChatbotOpen(false); // Close chatbot to trigger reset on reopen

      alert('Login successful!');

      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo);
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed. Please try again.';
      if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
      } else if (err.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      console.log('Google credential response:', credentialResponse);
      
      // Send the credential token to your backend
      const response = await API.post('/auth/google', {
        credential: credentialResponse.credential
      });

      console.log('Google auth response:', response.data);

      // Store tokens and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', response.data.user_id);
      
      setChatbotOpen(false);
      alert('Google login successful!');
      
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo);
      
    } catch (err) {
      console.error('Google login error:', err);
      let errorMessage = 'Google login failed. Please try again.';
      if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login error');
    setError('Google login failed. Please try again.');
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo);
    }

    const createParticles = () => {
      const particlesContainer = document.getElementById('particles');
      if (!particlesContainer) return;

      const particleCount = 30;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 6}s`;
        const size = Math.random() * 3 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        // Updated particle colors to match blue theme
        const colors = [
          'rgba(59, 130, 246, 0.3)', 
          'rgba(30, 64, 175, 0.3)', 
          'rgba(96, 165, 250, 0.3)',
          'rgba(37, 99, 235, 0.3)'
        ];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particlesContainer.appendChild(particle);
      }
    };

    createParticles();

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach((el) => {
      observer.observe(el);
    });

    const createRipple = (event) => {
      const button = event.currentTarget;
      const circle = document.createElement('span');
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
      circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
      circle.classList.add('ripple');

      const ripple = button.getElementsByClassName('ripple')[0];
      if (ripple) {
        ripple.remove();
      }

      button.appendChild(circle);
    };

    document.querySelectorAll('.form-button, .nav-button').forEach((button) => {
      button.addEventListener('click', createRipple);
    });

    return () => {
      document.querySelectorAll('.form-button, .nav-button').forEach((button) => {
        button.removeEventListener('click', createRipple);
      });
    };
  }, [navigate, location]);

  return (
    <div className="auth-container">
      <div className="particles" id="particles"></div>
      <div className="auth-wrapper">
        <div className="auth-form fade-in">
          <h2>Sign In to Your Account</h2>
          <p>Log in to continue your health journey with WellnessCare.</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                aria-label="Email"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                aria-label="Password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="form-button"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="google-login-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              theme="outline"
              size="large"
              disabled={loading}
            />
          </div>

          <div className="auth-link">
            <p>Don't have an account?</p>
            <button
              type="button"
              className="nav-button"
              onClick={() => navigate('/signup')}
              disabled={loading}
            >
              Sign Up
            </button>
          </div>
        </div>
        <div className="auth-decorative fade-in">
          <h3>Your Health, Our Priority</h3>
          <p>Empowering you with personalized diabetes and heart care solutions for a healthier tomorrow.</p>
        </div>
      </div>
    </div>
  );
}

