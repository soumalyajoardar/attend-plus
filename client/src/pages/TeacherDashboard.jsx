import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  
  const [teacherName] = useState('Admin Teacher');
  const [activePage, setActivePage] = useState('dashboard');
  
  // Class selection state
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classStarted, setClassStarted] = useState(false);
  
  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessionSecret, setSessionSecret] = useState('');
  const [currentToken, setCurrentToken] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [showManualCode, setShowManualCode] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifDepartment, setNotifDepartment] = useState('ALL');
  const [notifSemester, setNotifSemester] = useState('ALL');

  // Generate a random 6-digit alphanumeric code for manual entry
  const generateManualCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Generate token based on current time (changes every 5 seconds)
  const generateToken = (secret) => {
    if (!secret) return;
    const currentTime = Math.floor(Date.now() / 5000);
    const token = Math.floor(currentTime % 1000000).toString().padStart(6, '0');
    setCurrentToken(token);
  };

  // Rotate token every 5 seconds
  useEffect(() => {
    if (sessionActive && sessionSecret) {
      generateToken(sessionSecret);
      const interval = setInterval(() => {
        generateToken(sessionSecret);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionActive, sessionSecret]);

  // Enter class after selecting department, semester, subject
  const enterClass = () => {
    if (!selectedDepartment || !selectedSemester || !selectedSubject) {
      alert('Please select Department, Semester, and Subject.');
      return;
    }
    setClassStarted(true);
    setActivePage('attendance');
  };

  // Start attendance session
  const startSession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: selectedDepartment,
          semester: selectedSemester,
          subject: selectedSubject,
          teacherId: 'ADMIN-2026',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setSessionSecret(data.secret);
        setSessionActive(true);
        setAttendanceList([]);
        setShowManualCode(false);
        setManualCode(generateManualCode());
        generateToken(data.secret);
      } else {
        alert('Failed to start session.');
      }
    } catch (err) {
      console.error('Session start error:', err);
      alert('Cannot connect to backend. Make sure server is running.');
    }
  };

  // End attendance session
  const endSession = () => {
    setSessionActive(false);
    setSessionId('');
    setSessionSecret('');
    setCurrentToken('');
    setManualCode('');
    setAttendanceList([]);
    setShowManualCode(false);
  };

  // Simulate a student check-in (temporary)
  const simulateCheckIn = () => {
    const names = ['Rohan Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Roy', 'Vikram Singh'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomTime = new Date().toLocaleTimeString();
    setAttendanceList((prev) => [...prev, { id: Date.now(), name: randomName, time: randomTime }]);
  };

  // QR Code value (changes every 5 seconds)
  const qrValue = sessionActive ? `${sessionId}.${currentToken}` : '';

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'attendance', label: 'Start Attendance', icon: '✅' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'history', label: 'Attendance History', icon: '📅' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const sendNotification = async () => {
  if (!notifTitle.trim() || !notifMessage.trim()) {
    alert('Please fill in both title and message.');
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: notifTitle,
        message: notifMessage,
        department: notifDepartment,
        semester: notifSemester,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert('Notification sent successfully!');
      setNotifTitle('');
      setNotifMessage('');
      setNotifDepartment('ALL');
      setNotifSemester('ALL');
    } else {
      alert('Failed to send notification.');
    }
  } catch (err) {
    console.error('Notification error:', err);
    alert('Cannot connect to backend.');
  }
};

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">+</span>
          <h2>Attend<span>+</span></h2>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="teacher-card">
            <div className="teacher-avatar">👨‍🏫</div>
            <div className="teacher-details">
              <strong>{teacherName}</strong>
              <p>Teacher</p>
            </div>
          </div>
          <button className="logout-btn" onClick={() => {
            localStorage.removeItem('attendplus_token');
            localStorage.removeItem('attendplus_role');
            localStorage.removeItem('attendplus_user');
            navigate('/');
          }}>
            ⏻ Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h1>
            {activePage === 'attendance' ? 'Class Room' : 
             activePage === 'history' ? 'Attendance History' : 
             activePage === 'reports' ? 'Reports' : 
             activePage === 'settings' ? 'Settings' : 
             activePage === 'notifications' ? 'Notifications' : 
             'Dashboard'}
          </h1>
          <div className="topbar-right">
            <span className="date-text">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* ============ DASHBOARD PAGE ============ */}
        {activePage === 'dashboard' && (
          <div className="dashboard-overview">
            <div className="welcome-banner">
              <h2>Welcome back, {teacherName}! 👋</h2>
              <p>Here's what's happening in your classes today.</p>
            </div>

            {/* Quick Actions */}
            <div className="section-card">
              <h3>⚡ Quick Actions</h3>
              <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => setActivePage('attendance')}>
                  <span>✅</span>
                  <strong>Start Attendance</strong>
                </button>
                <button className="quick-action-btn" onClick={() => setActivePage('notifications')}>
                  <span>📢</span>
                  <strong>Post Notification</strong>
                </button>
                <button className="quick-action-btn" onClick={() => setActivePage('reports')}>
                  <span>📈</span>
                  <strong>View Reports</strong>
                </button>
                <button className="quick-action-btn" onClick={() => setActivePage('history')}>
                  <span>📅</span>
                  <strong>History</strong>
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="dashboard-grid">
              <div className="stat-card">
                <span className="stat-icon">🎓</span>
                <div>
                  <h3>248</h3>
                  <p>Total Students</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">✅</span>
                <div>
                  <h3>4</h3>
                  <p>Classes Today</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📊</span>
                <div>
                  <h3>92%</h3>
                  <p>Avg Attendance</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🚨</span>
                <div>
                  <h3>14</h3>
                  <p>Absentees This Week</p>
                </div>
              </div>
            </div>

            {/* Today's Classes */}
            <div className="section-card">
              <h3>📅 Today's Classes</h3>
              <div className="class-list">
                <div className="class-item">
                  <div className="class-time">
                    <strong>09:00</strong>
                    <small>AM</small>
                  </div>
                  <div className="class-details">
                    <strong>Data Structures</strong>
                    <p>CST • Semester 3rd • Room 204</p>
                  </div>
                </div>
                <div className="class-item">
                  <div className="class-time">
                    <strong>11:00</strong>
                    <small>AM</small>
                  </div>
                  <div className="class-details">
                    <strong>Algorithms</strong>
                    <p>CST • Semester 5th • Room 302</p>
                  </div>
                </div>
                <div className="class-item">
                  <div className="class-time">
                    <strong>02:00</strong>
                    <small>PM</small>
                  </div>
                  <div className="class-details">
                    <strong>Mathematics</strong>
                    <p>ETCE • Semester 1st • Room 108</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ CLASS SELECTION SCREEN ============ */}
        {!classStarted && activePage === 'attendance' && (
          <div className="class-selection-screen">
            <div className="class-selection-card">
              <div className="selection-header">
                <span className="selection-icon">🏫</span>
                <h2>Select Your Class</h2>
                <p>Choose the class details to enter the classroom</p>
              </div>
              
              <div className="input-group">
                <label>Department</label>
                <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                  <option value="">-- Select Department --</option>
                  <option value="CST">CST</option>
                  <option value="ETCE">ETCE</option>
                  <option value="EIE">EIE</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="MECHANICAL">MECHANICAL</option>
                  <option value="EE">EE</option>
                </select>
              </div>

              <div className="input-group">
                <label>Semester</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                  <option value="">-- Select Semester --</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                  <option value="5th">5th</option>
                  <option value="6th">6th</option>
                </select>
              </div>

              <div className="input-group">
                <label>Subject</label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                  <option value="">-- Select Subject --</option>
                  <option>Data Structures</option>
                  <option>Algorithms</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                  <option>English</option>
                </select>
              </div>

              <button className="btn-primary btn-block" onClick={enterClass}>
                Enter Class →
              </button>
            </div>
          </div>
        )}

        {/* ============ CLASS ROOM ============ */}
        {classStarted && activePage === 'attendance' && (
          <div className="attendance-page">
            <div className="class-header-banner">
              <div>
                <h2>{selectedSubject}</h2>
                <p>{selectedDepartment} • Semester {selectedSemester}</p>
              </div>
              <span className="class-live-badge">Live</span>
            </div>

            <div className="control-panel">
              <h2>Session Controls</h2>
              <p className="subtitle">Manage attendance for this class</p>

              {!sessionActive ? (
                <button className="btn-primary btn-block" onClick={startSession}>
                  ▶ Start Attendance
                </button>
              ) : (
                <button className="btn-danger btn-block" onClick={endSession}>
                  ⏹ End Session
                </button>
              )}

              {sessionActive && (
                <button className="btn-secondary btn-block" onClick={() => setShowManualCode(!showManualCode)}>
                  {showManualCode ? 'Hide Manual Code' : 'Show Manual Code'}
                </button>
              )}

              {sessionActive && showManualCode && (
                <div className="manual-code-box">
                  <p className="manual-label">Manual Code (Valid 60s)</p>
                  <h3 className="manual-code">{manualCode}</h3>
                </div>
              )}

              <div className="session-info">
                {sessionActive ? (
                  <>
                    <span className="live-dot"></span> Session Active
                    <p className="session-id">ID: {sessionId}</p>
                  </>
                ) : (
                  <p className="inactive-text">No active session</p>
                )}
              </div>
            </div>

            <div className="display-panel">
              <div className="qr-section">
                {sessionActive ? (
                  <>
                    <h3>Scan to Attend</h3>
                    <p className="qr-subtitle">{selectedDepartment} - {selectedSemester} | {selectedSubject}</p>
                    <div className="qr-code-wrapper">
                      <QRCodeCanvas value={qrValue} size={250} level="H" />
                    </div>
                    <p className="qr-hint">QR refreshes every 5 seconds</p>
                  </>
                ) : (
                  <div className="qr-placeholder-empty">
                    <div className="qr-dashed-border">
                      <span>QR Code will appear here</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="attendance-section">
                <h3>Live Attendance ({attendanceList.length})</h3>
                {attendanceList.length === 0 ? (
                  <p className="no-students">No students checked in yet...</p>
                ) : (
                  <ul className="attendance-list">
                    {attendanceList.map((student) => (
                      <li key={student.id} className="attendance-item">
                        <div className="student-avatar">👤</div>
                        <div className="student-info">
                          <strong>{student.name}</strong>
                          <p>{student.time}</p>
                        </div>
                        <span className="present-badge">Present</span>
                      </li>
                    ))}
                  </ul>
                )}
                {sessionActive && (
                  <button className="btn-secondary btn-block" onClick={simulateCheckIn}>
                    + Simulate Student Check-In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ PLACEHOLDER PAGES ============ */}
        {activePage === 'history' && (
          <div className="placeholder-page">
            <h2>📅 Attendance History</h2>
            <p>This feature is coming soon!</p>
          </div>
        )}
        {activePage === 'reports' && (
          <div className="placeholder-page">
            <h2>📈 Reports</h2>
            <p>This feature is coming soon!</p>
          </div>
        )}
        {activePage === 'settings' && (
          <div className="placeholder-page">
            <h2>⚙️ Settings</h2>
            <p>This feature is coming soon!</p>
          </div>
        )}
        {activePage === 'notifications' && (
  <div className="notifications-page">
    <div className="notification-form-card">
      <h2>📢 Post Notification</h2>
      <p className="subtitle">Send an announcement to your students</p>
      
      <div className="input-group">
        <label>Title</label>
        <input 
          type="text" 
          placeholder="e.g. Class Update" 
          className="text-input"
          value={notifTitle}
          onChange={(e) => setNotifTitle(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Message</label>
        <textarea 
          placeholder="e.g. Class will start in 5 minutes." 
          className="text-area" 
          rows="4"
          value={notifMessage}
          onChange={(e) => setNotifMessage(e.target.value)}
        />
      </div>

      <div className="row-fields">
        <div className="input-group">
          <label>Department</label>
          <select value={notifDepartment} onChange={(e) => setNotifDepartment(e.target.value)}>
            <option value="ALL">All Departments</option>
            <option value="CST">CST</option>
            <option value="ETCE">ETCE</option>
            <option value="EIE">EIE</option>
            <option value="CIVIL">CIVIL</option>
            <option value="MECHANICAL">MECHANICAL</option>
            <option value="EE">EE</option>
          </select>
        </div>
        <div className="input-group">
          <label>Semester</label>
          <select value={notifSemester} onChange={(e) => setNotifSemester(e.target.value)}>
            <option value="ALL">All Semesters</option>
            <option value="1st">1st</option>
            <option value="2nd">2nd</option>
            <option value="3rd">3rd</option>
            <option value="4th">4th</option>
            <option value="5th">5th</option>
            <option value="6th">6th</option>
          </select>
        </div>
      </div>

      <button className="btn-primary btn-block" onClick={sendNotification}>
        📨 Send Notification
      </button>
    </div>
  </div>
)}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bottom-nav-teacher">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={activePage === item.id ? 'active' : ''}
            onClick={() => setActivePage(item.id)}
          >
            <span>{item.icon}</span>
            <small>{item.label.split(' ')[0]}</small>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TeacherDashboard;