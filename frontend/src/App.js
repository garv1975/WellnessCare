import React, { useState, createContext } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from "./components/Navbar";
import Chatbot from "./components/Chatbot";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Services from "./pages/Services.jsx";
import FAQs from "./pages/FAQs.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import VideoCall from "./pages/VideoCall.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Profile from "./pages/Profile.jsx";
import BookAppointment from "./pages/BookAppointment.jsx";
import DoctorLogin from "./pages/DoctorLogin.jsx";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import DoctorVideoCall from "./pages/DoctorVideoCall.jsx";
import GoogleCallback from "./pages/GoogleCallback.jsx";
import "./App.css";

// Create Chatbot Context
export const ChatbotContext = createContext();

function App() {
    const [isOpen, setIsOpen] = useState(false);
    const [chatbotOpen, setChatbotOpen] = useState(false);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    return (
        <ChatbotContext.Provider value={{ chatbotOpen, setChatbotOpen }}>
            <Router>
                <div className="App">
                    <Navbar toggleSidebar={toggleSidebar} />
                    <Routes>
                        {/* Patient Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/faqs" element={<FAQs />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/video-call/:appointmentId" element={<VideoCall />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/book-appointment" element={<BookAppointment />} />
                        {/* Doctor Routes */}
                        <Route path="/doctor/login" element={<DoctorLogin />} />
                        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                        <Route path="/doctor/video-call/:appointmentId" element={<DoctorVideoCall />} />
                        {/* Google Callback Route */}
                        <Route path="/auth/google/callback" element={<GoogleCallback />} />
                    </Routes>
                    <Chatbot />
                </div>
            </Router>
        </ChatbotContext.Provider>
    );
}

export default App;