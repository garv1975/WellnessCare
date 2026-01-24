import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const handleConsultationClick = () => {
    console.log('Book Free Consultation button clicked');
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    if (token) {
      console.log('Navigating to /book-appointment');
      navigate('/book-appointment');
    } else {
      console.log('Navigating to /login with redirect state');
      navigate('/login', { state: { from: { pathname: '/book-appointment' } } });
    }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>India's Trusted Health Platform</h1>
          <p className="hero-subtitle">
            Accessible diabetes and cardiac care for Tier-3 cities with our phygital-first approach.
          </p>
          <div className="hero-buttons">
            <button
              className="cta-button"
              onClick={handleConsultationClick}
            >
              Book Free Consultation
            </button>
            <Link to="/about" className="learn-more-btn">Learn More</Link>
          </div>
        </div>
        <div className="hero-image">
          <img
            src="healthcare.jpg"
            alt="Healthcare Illustration"
            className="hero-img"
          />
        </div>


      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-item">
          <h3>10K+</h3>
          <p>Patients Served</p>
        </div>
        <div className="stat-item">
          <h3>90%</h3>
          <p>Success Rate</p>
        </div>
        <div className="stat-item">
          <h3>24/7</h3>
          <p>Support</p>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-section">
        <h2>Why Choose WellnessCare?</h2>
        <p className="section-subtitle">
          We combine technology and compassionate care for diabetes and cardiac wellness.
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🩺</div>
            <h3>Virtual Consultations</h3>
            <p>Connect with verified doctors via secure video calls from anywhere.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>AI Chatbot</h3>
            <p>Get instant guidance, reminders, and health tips with our integrated chatbot.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏙️</div>
            <h3>Tier-3 Focused</h3>
            <p>Built for rural and semi-urban communities with local language support.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure Platform</h3>
            <p>Your data is encrypted and protected with the highest standards.</p>
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="success-stories-section">
        <h2>Real Patient Success Stories</h2>
        <p className="section-subtitle">
          See how WellnessCare has transformed lives across India's Tier-3 markets.
        </p>
        <div className="stories-grid">
          <div className="story-card">
            <div className="rating">⭐⭐⭐⭐⭐</div>
            <p>"WellnessCare helped me manage my diabetes effectively. My HbA1c dropped from 9.0 to 6.5 in 6 months!"</p>
            <p className="patient-info">Rakesh Kumar, Nashik, Maharashtra<br />Diabetes Type 2, HbA1c: 9.0 → 6.5</p>
          </div>
          <div className="story-card">
            <div className="rating">⭐⭐⭐⭐⭐</div>
            <p>"The chatbot reminded me to take my meds, and the doctors were so supportive. My BP is now under control!"</p>
            <p className="patient-info">Anita Sharma, Jaipur, Rajasthan<br />Hypertension, BP: 160/100 → 130/80</p>
          </div>
          <div className="story-card">
            <div className="rating">⭐⭐⭐⭐⭐</div>
            <p>"I could consult a cardiologist without traveling. The video calls made follow-ups so easy."</p>
            <p className="patient-info">Mohammed Ali, Coimbatore, Tamil Nadu<br />Cardiac Care</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Transform Your Health Journey?</h2>
        <p>Join thousands of patients who trust WellnessCare for their diabetes and cardiac care.</p>
        <Link to="/signup" className="cta-button">Call Now: +91 9876543210</Link>
      </section>

      {/* Footer Section */}
      <footer className="footer-section">
        <div className="footer-content">
          <div className="footer-logo">
            <h3>WellnessCare</h3>
            <p>India's trusted platform for diabetes and cardiac wellness in Tier-3 markets. Powered by AI and real doctors.</p>
            <p>24/7 Emergency: +91 9876543210</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/faqs">FAQs</Link></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h4>Contact Info</h4>
            <p>123 Health Street, Tier-3 City, India 123456</p>
            <p>Email: care@wellnesscare.in</p>
            <p>Phone: +91 9876543210</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 WellnessCare. All rights reserved. Trusted healthcare for every Indian.</p>
        </div>
      </footer>
    </div>
  );
}