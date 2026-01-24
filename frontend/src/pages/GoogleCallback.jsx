import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatbotContext } from '../App';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setChatbotOpen } = React.useContext(ChatbotContext);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const user_id = params.get('user_id');

    if (token && user_id) {
      localStorage.setItem('token', token);
      localStorage.setItem('user_id', user_id);
      console.log('Google auth token stored:', token);
      console.log('Google auth user_id stored:', user_id);
      
      setChatbotOpen(false); // Close chatbot to trigger reset on reopen

      alert('Google authentication successful!');
      navigate('/dashboard', { state: { showOnboardingPrompt: true } });
    } else {
      console.error('Google callback missing token or user_id');
      navigate('/login', { state: { error: 'Google authentication failed. Please try again.' } });
    }
  }, [navigate, location, setChatbotOpen]);

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-form fade-in">
          <h2>Processing Google Authentication...</h2>
          <p>Please wait while we log you in.</p>
        </div>
      </div>
    </div>
  );
}