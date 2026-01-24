import React, { useState, useContext, useEffect, useRef } from 'react';
import { FiMessageSquare, FiX } from 'react-icons/fi';
import { ChatbotContext } from '../App';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Chatbot.css';

export default function Chatbot() {
  const { chatbotOpen, setChatbotOpen } = useContext(ChatbotContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [quickReplies, setQuickReplies] = useState([]);
  const [refreshDashboard, setRefreshDashboard] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [loginRoleSelection, setLoginRoleSelection] = useState(false); // New state for login role selection
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchChatHistory = async () => {
    try {
      const response = await API.get('/chatbot/history');
      setMessages(response.data.history.map((msg, index) => ({
        ...msg,
        id: index,
        timestamp: Date.now() + index
      })));
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setMessages([{ 
        id: 0,
        sender: 'bot', 
        text: 'Hi! How can I assist you today?',
        timestamp: Date.now()
      }]);
    }
  };

  const resetChat = () => {
    setMessages([{ 
      id: 0,
      sender: 'bot', 
      text: 'Hi! How can I assist you today?',
      timestamp: Date.now()
    }]);
    setQuickReplies(localStorage.getItem('token') 
      ? ['Book Appointment', 'Show Appointments', 'Cancel Appointment', 'Set Reminder', 'Set Up Profile', 'Diabetes FAQs', 'Heart Care FAQs']
      : ['Log In', 'Diabetes FAQs', 'Heart Care FAQs']);
    setInput('');
    setIsTyping(false);
    setLoginRoleSelection(false); // Reset login role selection
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (chatbotOpen) {
      if (token) {
        fetchChatHistory();
        setQuickReplies(['Book Appointment', 'Show Appointments', 'Cancel Appointment', 'Set Reminder', 'Set Up Profile', 'Diabetes FAQs', 'Heart Care FAQs']);
      } else {
        resetChat();
      }
    }
  }, [chatbotOpen]);

  const addMessage = (message) => {
    const newMessage = {
      ...message,
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateTyping = (duration = 1000) => {
    setIsTyping(true);
    return new Promise(resolve => {
      setTimeout(() => {
        setIsTyping(false);
        resolve();
      }, duration);
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const token = localStorage.getItem('token');
    const userMessage = { sender: 'user', text: input };
    addMessage(userMessage);
    setQuickReplies([]);
    
    const inputText = input;
    setInput('');

    // Check for restricted actions
    const restrictedActions = ['book appointment', 'show appointments', 'cancel appointment', 'set reminder'];
    if (!token && restrictedActions.some(action => inputText.toLowerCase().includes(action))) {
      await simulateTyping(800);
      const loginMessage = { sender: 'bot', text: 'Please log in to book appointments, view appointments, cancel appointments, or set reminders.' };
      addMessage(loginMessage);
      setQuickReplies(['Log In']);
      return;
    }

    try {
      await simulateTyping(1200);
      const response = await API.post('/chatbot', { 
        message: inputText, 
        user_id: localStorage.getItem('user_id') 
      });
      
      const botMessage = { sender: 'bot', text: response.data.response };
      addMessage(botMessage);
      updateQuickReplies(response.data.response);
      
      if (response.data.response.includes('Appointment booked successfully') || 
          response.data.response.includes('Appointment cancelled successfully') ||
          response.data.response.includes('Reminder set for')) {
        setRefreshDashboard(true);
      }
    } catch (error) {
      console.error('Chatbot error:', error.response || error);
      await simulateTyping(500);
      const errorMessage = { 
        sender: 'bot', 
        text: error.response?.data?.msg || 'Sorry, something went wrong. Please try again.' 
      };
      addMessage(errorMessage);
      setQuickReplies(token 
        ? ['Book Appointment', 'Show Appointments', 'Cancel Appointment', 'Set Reminder', 'Set Up Profile', 'Diabetes FAQs', 'Heart Care FAQs'] 
        : ['Log In', 'Diabetes FAQs', 'Heart Care FAQs']);
    }
  };

  const handleQuickReply = async (action) => {
    const token = localStorage.getItem('token');
    
    if (action === 'Log In') {
      await simulateTyping(800);
      const rolePrompt = { 
        sender: 'bot', 
        text: 'Are you a patient or a doctor?' 
      };
      addMessage(rolePrompt);
      setQuickReplies(['Patient', 'Doctor']);
      setLoginRoleSelection(true);
      return;
    }

    if (loginRoleSelection) {
      if (action === 'Patient' || action === 'Doctor') {
        const userMessage = { sender: 'user', text: action };
        addMessage(userMessage);
        await simulateTyping(800);
        const redirectMessage = { 
          sender: 'bot', 
          text: `Redirecting you to the ${action} login page...` 
        };
        addMessage(redirectMessage);
        setChatbotOpen(false);
        setLoginRoleSelection(false);
        navigate(action === 'Patient' ? '/login' : '/doctor/login');
        return;
      }
    }

    const restrictedActions = ['Book Appointment', 'Show Appointments', 'Cancel Appointment', 'Set Reminder'];
    if (!token && restrictedActions.includes(action)) {
      await simulateTyping(800);
      const loginMessage = { sender: 'bot', text: 'Please log in to book appointments, view appointments, cancel appointments, or set reminders.' };
      addMessage(loginMessage);
      setQuickReplies(['Log In']);
      return;
    }

    const userMessage = { sender: 'user', text: action };
    addMessage(userMessage);
    setQuickReplies([]);

    try {
      await simulateTyping(1200);
      const response = await API.post('/chatbot', { 
        message: action, 
        user_id: localStorage.getItem('user_id') 
      });
      
      const botMessage = { sender: 'bot', text: response.data.response };
      addMessage(botMessage);
      updateQuickReplies(response.data.response);
      
      if (response.data.response.includes('Appointment booked successfully') || 
          response.data.response.includes('Appointment cancelled successfully') ||
          response.data.response.includes('Reminder set for')) {
        setRefreshDashboard(true);
      }
    } catch (error) {
      console.error('Chatbot error:', error.response || error);
      await simulateTyping(500);
      const errorMessage = { 
        sender: 'bot', 
        text: error.response?.data?.msg || 'Sorry, something went wrong. Please try again.' 
      };
      addMessage(errorMessage);
      setQuickReplies(token 
        ? ['Book Appointment', 'Show Appointments', 'Cancel Appointment', 'Set Reminder', 'Set Up Profile', 'Diabetes FAQs', 'Heart Care FAQs'] 
        : ['Log In', 'Diabetes FAQs', 'Heart Care FAQs']);
    }
  };

  const updateQuickReplies = (response) => {
    const token = localStorage.getItem('token');
    if (loginRoleSelection) {
      setQuickReplies(['Patient', 'Doctor']);
      return;
    }
    if (!token) {
      setQuickReplies(['Log In', 'Diabetes FAQs', 'Heart Care FAQs']);
      return;
    }

    if (response.includes('select a valid ID') || response.includes('appointment ID')) {
      API.get('/appointments/my').then(res => {
        const ids = res.data.map(appt => appt.id.toString());
        setQuickReplies(ids.length > 0 ? ids : ['No appointments']);
      }).catch(() => {
        setQuickReplies(['Book Appointment', 'Show Appointments', 'Cancel Appointment', 'Set Reminder', 'Set Up Profile']);
      });
    } else if (response.includes('appointment time')) {
      setQuickReplies(['2025-06-08 14:00', '2025-06-09 10:00', 'Tomorrow at 15:00']);
    } else if (response.includes('reason for your visit')) {
      setQuickReplies(['Check-up', 'Consultation', 'Follow-up']);
    } else if (response.includes('medication name')) {
      setQuickReplies(['Insulin', 'Metformin', 'Aspirin']);
    } else if (response.includes('remind you')) {
      setQuickReplies(['08:00', '12:00', '18:00']);
    } else if (response.includes('full name') || response.includes('old are you') || response.includes('medical history')) {
      setQuickReplies(['Skip', 'None']);
    } else {
      setQuickReplies(['Book Appointment', 'Show Appointments', 'Cancel Appointment', 'Set Reminder', 'Set Up Profile', 'Diabetes FAQs', 'Heart Care']);
    }
  };

  const handleToggle = () => {
    if (chatbotOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setChatbotOpen(false);
        setIsClosing(false);
      }, 300);
    } else {
      setChatbotOpen(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (refreshDashboard) {
      navigate('/dashboard', { state: { refresh: true } });
      setRefreshDashboard(false);
    }
  }, [navigate, refreshDashboard]);

  return (
    <div className="chatbot-container">
      {chatbotOpen && (
        <div className={`chat-window ${isClosing ? 'closing' : ''}`}>
          <div className="chat-header">
            <div>
              <h3>WellnessCare Assistant</h3>
              <div className="chat-status">
                <div className="status-dot"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
          
          <div className="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.sender === 'user' ? 'user' : 'bot'}`}
                style={{ animationDelay: '0.1s' }}
              >
                {msg.text}
              </div>
            ))}
            
            {isTyping && (
              <div className="typing-indicator">
                <span>Assistant is typing</span>
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {quickReplies.length > 0 && (
            <div className="quick-replies">
              {quickReplies.map((reply, index) => (
                <button 
                  key={index} 
                  onClick={() => handleQuickReply(reply)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              aria-label="Chatbot input"
              disabled={isTyping}
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isTyping}
            >
              Send
            </button>
          </div>
        </div>
      )}
      
      <button className="chat-toggle" onClick={handleToggle}>
        {chatbotOpen ? <FiX size={24} /> : <FiMessageSquare size={24} />}
      </button>
    </div>
  );
}