import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from './QRScanner';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('attendplus_user') || '{}');

  const [studentName] = useState(storedUser.fullName || 'Student');
  const [department] = useState(storedUser.department || 'CST');
  const [semester] = useState(storedUser.semester || '1st');
  const [registrationNo] = useState(storedUser.registrationNo || 'N/A');
  const [activeSection, setActiveSection] = useState('home');
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const dept = department || 'CST';
      const sem = semester || '1st';
      const response = await fetch(`https://attend-plus-server.onrender.com/api/notifications/${dept}/${sem}`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.readBy.includes(registrationNo)).length;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="student-container">
      <nav className="student-nav">
        <div className="student-logo">
          <span className="logo-icon">+</span>
          <h2>Attend<span>+</span></h2>
        </div>
        <div className="student-nav-right">
          <button className="nav-icon-btn" onClick={() => setActiveSection('notifications')}>
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          <div className="student-avatar-small">👤</div>
        </div>
      </nav>

      <main className="student-main">
        <div className="student-welcome">
          <h1>Hello, {studentName.split(' ')[0]}! 👋</h1>
          <p>{department} • Semester {semester} • {registrationNo}</p>
        </div>

        <div className="student-content-grid">
          <div className="scan-stats-column">
            <div className="scan-section">
              <button className="scan-btn" onClick={() => setShowScanner(true)}>
                <span className="scan-icon">📷</span>
                <span className="scan-text">
                  <strong>Scan QR Code</strong>
                  <small>Mark your attendance</small>
                </span>
              </button>
            </div>
          </div>

          <div className="notifications-column">
            <div className="section-header">
              <h3>🔔 Notifications</h3>
              <button className="view-all-btn" onClick={fetchNotifications}>🔄</button>
            </div>
            <div className="notification-list">
              {loadingNotifications ? (
                <p className="loading-text">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="loading-text">No notifications yet.</p>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <div key={notif._id} className={`notification-item ${!notif.readBy.includes(registrationNo) ? 'unread' : ''}`}>
                    <div className="notification-dot"></div>
                    <div className="notification-content">
                      <strong>{notif.title}</strong>
                      <p>{notif.message}</p>
                      <small>{new Date(notif.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <button className="logout-btn-student" onClick={handleLogout}>⏻ Logout</button>
      </main>

      {showScanner && (
        <QRScanner 
          onClose={() => setShowScanner(false)} 
          onSuccess={(message) => {
            setShowScanner(false);
            alert(message);
          }}
        />
      )}
    </div>
  );
};

export default StudentDashboard;