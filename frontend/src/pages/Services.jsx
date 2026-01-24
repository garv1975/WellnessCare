import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatbotContext } from '../App';
import './Services.css';

const Services = () => {
  const navigate = useNavigate();
  const { setChatbotOpen } = useContext(ChatbotContext);

  useEffect(() => {
    // Initialize particles
    const createParticles = () => {
      const particlesContainer = document.getElementById('particles');
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

    // Intersection Observer for fade-in animations
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

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          const offset = 80;
          const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
          window.scrollTo({
            top: elementPosition - offset,
            behavior: 'smooth',
          });
        }
      });
    });

    // Ripple effect for buttons
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

    document.querySelectorAll('.cta-button, .hero-cta, .service-cta').forEach((button) => {
      button.addEventListener('click', createRipple);
    });

    // Parallax effect for hero
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.5;
      const hero = document.querySelector('.hero');
      if (hero) {
        hero.style.transform = `translateY(${rate}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.querySelectorAll('.cta-button, .hero-cta, .service-cta').forEach((button) => {
        button.removeEventListener('click', createRipple);
      });
    };
  }, []);

  const handleServiceCtaClick = (service) => {
    console.log(`${service} CTA clicked`);
    const token = localStorage.getItem('token');
    if (service === 'Health Assistant') {
      setChatbotOpen(true);
      console.log('Opening chatbot');
    } else if (service === 'Progress Tracking') {
      navigate(token ? '/dashboard' : '/login');
    } else {
      navigate(token ? '/book-appointment' : '/login');
    }
  };

  return (
    <div className="page-container">
      <div className="particles" id="particles"></div>

      <section className="hero">
        <div className="hero-content">
          <h1>Our Services</h1>
          <p>Comprehensive healthcare solutions tailored for diabetes and heart wellness in underserved communities</p>
          <a href="#services" className="hero-cta">
            <span>Explore Services</span>
            <span className="arrow">→</span>
          </a>
        </div>
        <div className="wave"></div>
      </section>

      <div className="container">
        <section id="services" className="services-intro fade-in">
          <h2>Complete Healthcare Solutions</h2>
          <p>Experience the future of healthcare with our AI-powered platform, connecting you to verified doctors and comprehensive care programs designed specifically for diabetes and heart health management.</p>
        </section>

        <div className="services-grid">
          <div className="service-card fade-in">
            <div className="service-icon">🩺</div>
            <h3>Virtual Doctor Consultations</h3>
            <p>Connect with certified specialists for diabetes and heart health through secure video consultations from the comfort of your home.</p>
            <ul className="service-features">
              <li>24/7 doctor availability</li>
              <li>Specialized in diabetes & cardiology</li>
              <li>Secure and confidential</li>
              <li>Prescription management</li>
            </ul>
            <button type="button" className="service-cta" onClick={() => handleServiceCtaClick('Virtual Consultation')}>
              <span>Book Consultation</span>
              <span className="arrow">→</span>
            </button>
          </div>

          <div className="service-card fade-in">
            <div className="service-icon">📅</div>
            <h3>Smart Appointment Booking</h3>
            <p>Effortlessly schedule appointments with your preferred doctors using our intelligent booking system that fits your schedule.</p>
            <ul className="service-features">
              <li>Choose preferred doctors</li>
              <li>Flexible time slots</li>
              <li>Automatic reminders</li>
              <li>Easy rescheduling</li>
            </ul>
            <button type="button" className="service-cta" onClick={() => handleServiceCtaClick('Appointment Booking')}>
              <span>Schedule Now</span>
              <span className="arrow">→</span>
            </button>
          </div>

          <div className="service-card fade-in">
            <div className="service-icon">📹</div>
            <h3>Secure Video Consultations</h3>
            <p>High-quality, encrypted video calls ensure private and effective communication with healthcare professionals.</p>
            <ul className="service-features">
              <li>HD video quality</li>
              <li>End-to-end encryption</li>
              <li>Screen sharing capabilities</li>
              <li>Session recordings</li>
            </ul>
            <button type="button" className="service-cta" onClick={() => handleServiceCtaClick('Video Consultation')}>
              <span>Start Video Call</span>
              <span className="arrow">→</span>
            </button>
          </div>

          <div className="service-card fade-in">
            <div className="service-icon">💬</div>
            <h3>AI-Powered Health Assistant</h3>
            <p>Get instant guidance, medication reminders, and health tips from our intelligent chatbot available 24/7.</p>
            <ul className="service-features">
              <li>Instant health queries</li>
              <li>Medication reminders</li>
              <li>Symptom tracking</li>
              <li>Emergency alerts</li>
            </ul>
            <button type="button" className="service-cta" onClick={() => handleServiceCtaClick('Health Assistant')}>
              <span>Chat Now</span>
              <span className="arrow">→</span>
            </button>
          </div>

          <div className="service-card fade-in">
            <div className="service-icon">📈</div>
            <h3>Health Progress Tracking</h3>
            <p>Monitor your health journey with comprehensive tracking tools and personalized insights for better outcomes.</p>
            <ul className="service-features">
              <li>Blood sugar monitoring</li>
              <li>Heart rate tracking</li>
              <li>Progress reports</li>
              <li>Trend analysis</li>
            </ul>
            <button type="button" className="service-cta" onClick={() => handleServiceCtaClick('Progress Tracking')}>
              <span>View Dashboard</span>
              <span className="arrow">→</span>
            </button>
          </div>

          <div className="service-card fade-in">
            <div className="service-icon">🎯</div>
            <h3>Personalized Care Plans</h3>
            <p>Receive customized treatment plans based on your specific health conditions, lifestyle, and medical history.</p>
            <ul className="service-features">
              <li>Tailored treatment plans</li>
              <li>Lifestyle recommendations</li>
              <li>Diet and exercise guidance</li>
              <li>Regular plan updates</li>
            </ul>
            <button type="button" className="service-cta" onClick={() => handleServiceCtaClick('Care Plan')}>
              <span>Get Plan</span>
              <span className="arrow">→</span>
            </button>
          </div>
        </div>

        <section className="process fade-in">
          <h2>How It Works</h2>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <h3>Sign Up & Profile</h3>
              <p>Create your account and complete your health profile with our secure registration process.</p>
            </div>
            <div className="process-step">
              <div className="step-number">2</div>
              <h3>Choose Your Doctor</h3>
              <p>Browse and select from our network of verified specialists based on your specific needs.</p>
            </div>
            <div className="process-step">
              <div className="step-number">3</div>
              <h3>Book Appointment</h3>
              <p>Schedule your consultation at a convenient time that fits your schedule.</p>
            </div>
            <div className="process-step">
              <div className="step-number">4</div>
              <h3>Receive Care</h3>
              <p>Connect with your doctor through secure video consultation and receive personalized treatment.</p>
            </div>
          </div>
        </section>

        <section className="testimonials fade-in">
          <h2>What Our Patients Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p className="testimonial-text">WellnessCare has transformed my diabetes management. The doctors are knowledgeable and the platform is so easy to use. I can get expert advice without traveling to the city.</p>
              <div className="testimonial-author">
                <div className="author-avatar">R</div>
                <div className="author-info">
                  <h4>Rajesh Kumar</h4>
                  <p>Diabetes Patient, Kota</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <p className="testimonial-text">The heart health monitoring features are excellent. My cardiologist can track my progress remotely, and I feel much more confident about my health management.</p>
              <div className="testimonial-author">
                <div className="author-avatar">S</div>
                <div className="author-info">
                  <h4>Sunita Sharma</h4>
                  <p>Heart Patient, Udaipur</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <p className="testimonial-text">The AI chatbot is incredibly helpful for daily health queries. It's like having a health assistant available 24/7. The medication reminders have been a game-changer.</p>
              <div className="testimonial-author">
                <div className="author-avatar">A</div>
                <div className="author-info">
                  <h4>Amit Patel</h4>
                  <p>Regular User, Bikaner</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cta fade-in">
          <h3>Ready to Start Your Health Journey?</h3>
          <p>Join thousands of patients who have already transformed their health with our comprehensive care platform.</p>
          <button type="button" className="cta-button" onClick={() => handleServiceCtaClick('Get Started')}>
            Get Started Today
          </button>
        </section>
      </div>
    </div>
  );
};

export default Services;