import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from './QRScanner';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  
  // Get actual student data from localStorage (saved during login)
  const storedUser = JSON.parse(localStorage.getItem('attendplus_user') || '{}');

  const [studentName] = useState(storedUser.fullName || 'Student');
  const [department] = useState(storedUser.department || 'CST');
  const [semester] = useState(storedUser.semester || '1st');
  const [registrationNo] = useState(storedUser.registrationNo || 'N/A');
  
  // Active section state
  const [activeSection, setActiveSection] = useState('home');
  
  // Notifications state (real data from backend)
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Attendance history (temporary - will connect to backend later)
  const [attendanceHistory] = useState([
    { id: 1, subject: 'Data Structures', date: '2026-08-14', status: 'Present' },
    { id: 2, subject: 'Algorithms', date: '2026-08-13', status: 'Present' },
    { id: 3, subject: 'Mathematics', date: '2026-08-12', status: 'Absent' },
    { id: 4, subject: 'Physics', date: '2026-08-11', status: 'Present' },
  ]);

  const unreadCount = notifications.filter(n => !n.readBy.includes(registrationNo)).length;

  // Fetch notifications from backend
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
      console.error('Fetch notifications error:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fetch notifications when component loads
  useEffect(() => {
  fetchNotifications();
  
  // Auto-refresh notifications every 10 seconds
  const interval = setInterval(() => {
    fetchNotifications();
  }, 10000);
  
  return () => clearInterval(interval);
}, []);

  const handleLogout = () => {
    localStorage.removeItem('attendplus_token');
    localStorage.removeItem('attendplus_role');
    localStorage.removeItem('attendplus_user');
    navigate('/');
  };

  return (
    <div className="student-container">
      {/* Top Navigation */}
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

      {/* Main Content */}
      <main className="student-main">
        {/* Welcome Section */}
        <div className="student-welcome">
          <h1>Hello, {studentName.split(' ')[0]}! 👋</h1>
          <p>{department} • Semester {semester} • {registrationNo}</p>
        </div>

        {/* Dashboard Content Grid */}
        <div className="student-content-grid">
          {/* Left Column: Scan + Stats */}
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

            <div className="student-stats-grid">
              <div className="student-stat-card">
                <span className="stat-icon">✅</span>
                <div>
                  <h3>92%</h3>
                  <p>Attendance</p>
                </div>
              </div>
              <div className="student-stat-card">
                <span className="stat-icon">📚</span>
                <div>
                  <h3>48</h3>
                  <p>Classes Attended</p>
                </div>
              </div>
              <div className="student-stat-card">
                <span className="stat-icon">📅</span>
                <div>
                  <h3>6</h3>
                  <p>Remaining</p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Notifications */}
          <div className="notifications-column">
            <div className="section-header">
  <h3>🔔 Notifications</h3>
  <div style={{ display: 'flex', gap: '10px' }}>
    <button className="view-all-btn" onClick={fetchNotifications}>
      🔄 Refresh
    </button>
    <button className="view-all-btn" onClick={() => setActiveSection('notifications')}>
      View All
    </button>
  </div>
</div>
            <div className="notification-list">
              {loadingNotifications ? (
                <p className="loading-text">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p className="loading-text">No notifications yet.</p>
              ) : (
                notifications.slice(0, 3).map((notif) => (
                  <div 
                    key={notif._id} 
                    className={`notification-item ${!notif.readBy.includes(registrationNo) ? 'unread' : ''}`}
                  >
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

          {/* Right Column: Attendance History */}
          <div className="history-column">
            <div className="section-header">
              <h3>📊 Attendance History</h3>
              <button className="view-all-btn" onClick={() => setActiveSection('history')}>
                View All
              </button>
            </div>
            <div className="history-list">
              {attendanceHistory.map((record) => (
                <div key={record.id} className="history-item">
                  <div>
                    <strong>{record.subject}</strong>
                    <p>{record.date}</p>
                  </div>
                  <span className={`status-badge ${record.status.toLowerCase()}`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button className="logout-btn-student" onClick={handleLogout}>
          ⏻ Logout
        </button>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bottom-nav">
        <button className={activeSection === 'home' ? 'active' : ''} onClick={() => setActiveSection('home')}>
          🏠 <span>Home</span>
        </button>
        <button className={activeSection === 'scanner' ? 'active' : ''} onClick={() => setShowScanner(true)}>
          📷 <span>Scan</span>
        </button>
        <button className={activeSection === 'notifications' ? 'active' : ''} onClick={() => setActiveSection('notifications')}>
          🔔 <span>Alerts</span>
        </button>
        <button className={activeSection === 'history' ? 'active' : ''} onClick={() => setActiveSection('history')}>
          📊 <span>History</span>
        </button>
      </nav>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner 
  onClose={() => {
    setShowScanner(false);
    fetchNotifications(); // Refresh notifications when scanner closes
  }} 
  onSuccess={(message) => {
    alert(message);
    setShowScanner(false);
    fetchNotifications(); // Refresh after successful scan
  }}
/>
      )}
    </div>
  );
};

export default StudentDashboard;