import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  const handleSignOut = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="user-avatar">{userInitial}</div>
        <h3>{user.name || "Guest User"}</h3>
        <button className="close-sidebar" onClick={toggleSidebar}>
          ×
        </button>
      </div>
      <ul className="sidebar-links">
        <li>
          <Link to="/profile" onClick={toggleSidebar}>
            Profile
          </Link>
        </li>
        <li>
          <Link to="/dashboard" onClick={toggleSidebar}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/dashboard" onClick={toggleSidebar}>
            Book an Appointment
          </Link>
        </li>
        <li>
          <button className="signout-button" onClick={handleSignOut}>
            Sign Out
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;