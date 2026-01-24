import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import './About.css';

const About = () => {
  const navigate = useNavigate(); // Added for navigation

  useEffect(() => {
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

    // Floating particles
    const createParticles = () => {
      const particlesContainer = document.getElementById('particles');
      const particleCount = 30;

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        const size = Math.random() * 3 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        const colors = ['rgba(59, 130, 246, 0.3)', 'rgba(5, 150, 105, 0.3)', 'rgba(139, 92, 246, 0.3)'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particlesContainer.appendChild(particle);
      }
    };

    createParticles();

    // Smooth scroll for anchor links with offset
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

    // Dynamic text typing effect for hero title
    const typeWriter = (element, text, speed = 100) => {
      let i = 0;
      element.innerHTML = '';
      element.style.opacity = '1';

      const type = () => {
        if (i < text.length) {
          element.innerHTML += text.charAt(i);
          i++;
          setTimeout(type, speed);
        }
      };

      setTimeout(() => {
        type();
      }, 1000);
    };

    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) {
      const originalText = heroTitle.textContent;
      heroTitle.style.opacity = '0';
      typeWriter(heroTitle, originalText, 80);
    }

    // Add ripple effect to buttons
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

    document.querySelectorAll('.cta-button, .hero-cta, .vision-cta').forEach((button) => {
      button.addEventListener('click', createRipple);
    });

    // Add number counting animation for stats
    const animateNumbers = () => {
      const statNumbers = document.querySelectorAll('.stat-number');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target;
            const finalNumber = target.textContent;
            const numericValue = parseInt(finalNumber.replace(/\D/g, ''));
            const suffix = finalNumber.replace(/[\d,]/g, '');
            let current = 0;
            const increment = numericValue / 50;
            const timer = setInterval(() => {
              current += increment;
              if (current >= numericValue) {
                current = numericValue;
                clearInterval(timer);
              }
              target.textContent = Math.floor(current).toLocaleString() + suffix;
            }, 30);
            observer.unobserve(target);
          }
        });
      });
      statNumbers.forEach((num) => observer.observe(num));
    };

    animateNumbers();

    // Cleanup event listeners on component unmount
    return () => {
      document.querySelectorAll('.cta-button, .hero-cta, .vision-cta').forEach((button) => {
        button.removeEventListener('click', createRipple);
      });
    };
  }, []);

  // Modified to check login status and navigate accordingly
  const handleCtaClick = () => {
    console.log('CTA button clicked');
    const token = localStorage.getItem('token');
    navigate(token ? '/book-appointment' : '/login');
  };

  return (
    <div className="page-container">
      <div className="particles" id="particles"></div>

      <section className="hero">
        <div className="hero-content">
          <h1>About WellnessCare</h1>
          <p>Revolutionizing healthcare accessibility in underserved communities through technology and compassion</p>
          <a href="#mission" className="hero-cta">
            <span>Discover Our Mission</span>
            <span className="arrow">→</span>
          </a>
        </div>
        <div className="wave"></div>
      </section>

      <div className="container">
        <section id="mission" className="mission fade-in">
          <h2>Our Mission</h2>
          <div className="mission-content">
            <p>
              At WellnessCare, our mission is to provide accessible, reliable, and high-quality healthcare to underserved communities. We are focused on diabetes and heart wellness, targeting Tier-3 cities with a tech-enabled, phygital-first approach.
            </p>
            <p>
              Powered by AI and supported by real medical professionals, our platform connects patients to verified doctors through a seamless online experience. We bridge the gap between advanced medical technology and local healthcare needs, ensuring that quality care reaches every corner of our nation.
            </p>
          </div>
        </section>

        <section className="stats fade-in">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-number">50K+</div>
              <div className="stat-label">Patients Served</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🩺</div>
              <div className="stat-number">200+</div>
              <div className="stat-label">Verified Doctors</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📍</div>
              <div className="stat-number">15+</div>
              <div className="stat-label">Tier-3 Cities</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❤️</div>
              <div className="stat-number">95%</div>
              <div className="stat-label">Patient Satisfaction</div>
            </div>
          </div>
        </section>

        <section className="values fade-in">
          <h2>Our Core Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">🛡️</div>
              <h3>Trust & Reliability</h3>
              <p>Every doctor on our platform is thoroughly verified and certified, ensuring you receive care from qualified professionals with proven track records.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">❤️</div>
              <h3>Compassionate Care</h3>
              <p>We believe healthcare should be delivered with empathy and understanding, putting patient wellbeing first in every interaction and decision.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🧠</div>
              <h3>AI-Powered Insights</h3>
              <p>Our advanced AI technology helps doctors make more accurate diagnoses and personalized treatment recommendations, enhancing care quality.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🏆</div>
              <h3>Excellence in Service</h3>
              <p>We maintain the highest standards of medical care while making it accessible to underserved communities across India.</p>
            </div>
          </div>
        </section>

        <section className="team fade-in">
          <h2>Meet Our Team</h2>
          <p className="team-subtitle">Dedicated professionals working tirelessly to transform healthcare delivery in underserved communities</p>
          <div className="team-grid">
            <div className="team-card">
              <div className="team-avatar">👨‍⚕️</div>
              <div className="team-name">Dr. Rajesh Kumar</div>
              <div className="team-role">Chief Medical Officer</div>
              <p className="team-bio">Leading cardiologist with 15+ years of experience in rural healthcare and telemedicine initiatives.</p>
            </div>
            <div className="team-card">
              <div className="team-avatar">👩‍💻</div>
              <div className="team-name">Priya Sharma</div>
              <div className="team-role">Head of Technology</div>
              <p className="team-bio">AI/ML expert specializing in healthcare applications and patient care optimization systems.</p>
            </div>
            <div className="team-card">
              <div className="team-avatar">👨‍💼</div>
              <div className="team-name">Amit Patel</div>
              <div className="team-role">Operations Director</div>
              <p className="team-bio">Healthcare operations specialist focused on scaling medical services in Tier-3 cities.</p>
            </div>
            <div className="team-card">
              <div className="team-avatar">👩‍⚕️</div>
              <div className="team-name">Dr. Sunita Gupta</div>
              <div className="team-role">Diabetes Specialist</div>
              <p className="team-bio">Renowned endocrinologist dedicated to diabetes care and prevention in rural communities.</p>
            </div>
          </div>
        </section>

        <section className="vision fade-in">
          <div className="vision-content">
            <h2>Our Vision</h2>
            <p>
              To become the leading healthcare platform in India's Tier-3 cities, where every individual has access to quality medical care regardless of their location or economic status. We envision a future where technology and human compassion work together to create a healthier, more equitable society.
            </p>
            <p>
              By 2030, we aim to reach 100+ cities, serve 1 million patients, and establish a network of 1000+ verified healthcare professionals, making quality healthcare a reality for every Indian.
            </p>
            <a href="#cta" className="vision-cta">
              <span>Join Our Mission</span>
              <span className="arrow">→</span>
            </a>
          </div>
        </section>

        <section id="cta" className="cta fade-in">
          <h3>Ready to Experience Better Healthcare?</h3>
          <p>Connect with our verified doctors and take the first step towards better health and wellness. Your journey to optimal health starts here.</p>
          <button type="button" className="cta-button" onClick={handleCtaClick}>
            Get Started Today
          </button>
        </section>
      </div>
    </div>
  );
};

export default About;