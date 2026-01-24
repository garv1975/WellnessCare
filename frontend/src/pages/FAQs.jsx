import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import './FAQs.css';

const FAQs = () => {
  // State for accordion (which FAQ is open)
  const [openIndex, setOpenIndex] = useState(null);
  const navigate = useNavigate(); // Added for navigation

  // Toggle accordion item
  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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

    document.querySelectorAll('.cta-button, .hero-cta, .faq-toggle').forEach((button) => {
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
      document.querySelectorAll('.cta-button, .hero-cta, .faq-toggle').forEach((button) => {
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

  // FAQ data
  const faqs = [
    {
      question: 'Who can use this platform?',
      answer: 'Anyone who needs diabetes or cardiac care, especially from remote areas or Tier-3 towns.',
    },
    {
      question: 'How do I book an appointment?',
      answer: 'Sign in, choose a doctor, pick a time, and confirm. Simple and quick!',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, your personal and medical data is encrypted and never shared without your consent.',
    },
    {
      question: 'What if I miss a video call?',
      answer: 'You can reschedule your appointment anytime from the dashboard.',
    },
  ];

  return (
    <div className="page-container">
      <div className="particles" id="particles"></div>

      <section className="hero">
        <div className="hero-content">
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about our healthcare platform and how we support diabetes and heart wellness.</p>
          <a href="#faqs" className="hero-cta">
            <span>Explore FAQs</span>
            <span className="arrow">→</span>
          </a>
        </div>
        <div className="wave"></div>
      </section>

      <div className="container">
        <section id="faqs" className="faqs fade-in">
          <h2>Your Questions Answered</h2>
          <p>Learn more about how WellnessCare works and how we can help you manage your health effectively.</p>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <button
                  type="button"
                  className={`faq-toggle ${openIndex === index ? 'active' : ''}`}
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="faq-icon">❓</span>
                  <span className="faq-question">{faq.question}</span>
                  <span className="faq-arrow">{openIndex === index ? '▲' : '▼'}</span>
                </button>
                <div
                  id={`faq-answer-${index}`}
                  className={`faq-answer ${openIndex === index ? 'open' : ''}`}
                  role="region"
                  aria-labelledby={`faq-toggle-${index}`}
                >
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="cta" className="cta fade-in">
          <h3>Ready to Start Your Health Journey?</h3>
          <p>Join thousands of patients who have already transformed their health with our comprehensive care platform.</p>
          <button type="button" className="cta-button" onClick={handleCtaClick}>
            Get Started Today
          </button>
        </section>
      </div>
    </div>
  );
};

export default FAQs;