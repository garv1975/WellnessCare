import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { ChatbotContext } from '../App';
import API from '../api';
import './Signup.css';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setChatbotOpen } = useContext(ChatbotContext);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const dataToSend = {
        email: formData.email.trim(),
        password: formData.password
      };

      console.log('Signup data:', dataToSend);

      const signupResponse = await API.post('/auth/register', dataToSend);
      console.log('Signup response:', signupResponse.data);

      localStorage.setItem('token', signupResponse.data.token);
      localStorage.setItem('user_id', signupResponse.data.user_id);
      console.log('Token stored:', signupResponse.data.token);
      console.log('User ID stored:', signupResponse.data.user_id);

      setChatbotOpen(false); // Close chatbot to trigger reset on reopen

      alert('Signup successful! You are now logged in.');
      navigate('/dashboard', { state: { showOnboardingPrompt: true } });
    } catch (err) {
      console.error('Signup error:', err);
      let errorMessage = 'Signup failed. Please try again.';
      if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
      } else if (err.response?.status === 400) {
        errorMessage = 'Please check your input and try again';
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
      alert('Google signup successful!');
      navigate('/dashboard', { state: { showOnboardingPrompt: true } });
      
    } catch (err) {
      console.error('Google signup error:', err);
      let errorMessage = 'Google signup failed. Please try again.';
      if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google signup error');
    setError('Google signup failed. Please try again.');
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
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
        const colors = ['rgba(59, 130, 246, 0.3)', 'rgba(5, 150, 105, 0.3)', 'rgba(139, 92, 246, 0.3)'];
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
  }, [navigate]);

  return (
    <div className="auth-container">
      <div className="particles" id="particles"></div>
      <div className="auth-wrapper">
        <div className="auth-form fade-in">
          <h2>Create Your Account</h2>
          <p>Sign up to start your health journey with WellnessCare. After signup, our chatbot will guide you through profile setup.</p>

          {error && (
            <div className="error-message" style={{
              color: '#ef4444',
              backgroundColor: '#fef2f2',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
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
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Create a password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                aria-label="Password"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength="6"
                aria-label="Confirm Password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="form-button"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="google-login-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signup_with"
              theme="outline"
              size="large"
              disabled={loading}
            />
          </div>

          <div className="auth-link">
            <p>Already have an account?</p>
            <button
              type="button"
              className="nav-button"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Log In
            </button>
          </div>
        </div>
        <div className="auth-decorative fade-in">
          <h3>Your Health, Our Priority</h3>
          <p>Empowering you with personalized diabetes and heart care solutions.</p>
        </div>
      </div>
    </div>
  );
}