import React from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="profile-container">
      <h1 className="profile-title">Your Profile</h1>
      <div className="profile-card">
        <div className="profile-avatar">
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="profile-details">
          <div className="profile-item">
            <label className="profile-label">Full Name</label>
            <p className="profile-value">{user.name || "Not provided"}</p>
          </div>
          <div className="profile-item">
            <label className="profile-label">Email</label>
            <p className="profile-value">{user.email || "Not provided"}</p>
          </div>
          <div className="profile-item">
            <label className="profile-label">Age</label>
            <p className="profile-value">{user.age || "Not provided"}</p>
          </div>
          <div className="profile-item">
            <label className="profile-label">Health Condition</label>
            <p className="profile-value">{user.condition || "Not provided"}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="profile-back-button"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}