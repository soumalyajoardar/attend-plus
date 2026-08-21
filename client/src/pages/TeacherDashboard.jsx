import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import './TeacherDashboard.css';
import { API_BASE } from '../utils/api';
import { clearSession, getUser } from '../utils/auth';
import { useToast, ToastStack } from '../components/Toast';
import {
  IconChart, IconCheck, IconBell, IconCalendar, IconTrendingUp, IconSettings,
  IconUsers, IconAlertCircle, IconSend, IconPlay, IconStop, IconLogout,
  IconRefresh, IconMoon, IconSun, IconCheckCircle, IconUser as IconUserIcon,
} from '../components/Icons';

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: IconChart },
  { id: 'attendance', label: 'Start Attendance', icon: IconCheck },
  { id: 'notifications', label: 'Notifications', icon: IconBell },
  { id: 'history', label: 'Attendance History', icon: IconCalendar },
  { id: 'reports', label: 'Reports', icon: IconTrendingUp },
  { id: 'settings', label: 'Settings', icon: IconSettings },
];

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const storedUser = getUser();
  const { toasts, showToast } = useToast();

  const [teacherName] = useState(storedUser.fullName || 'Admin Teacher');
  const [activePage, setActivePage] = useState('dashboard');

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classStarted, setClassStarted] = useState(false);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessionSecret, setSessionSecret] = useState('');
  const [currentToken, setCurrentToken] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [showManualCode, setShowManualCode] = useState(false);

  // Notification state — global only, no department/semester targeting
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sentNotifications, setSentNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [sending, setSending] = useState(false);

  // Attendance history (all records) for the History page
  const [allHistory, setAllHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem('attendplus_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('attendplus_theme', theme);
  }, [theme]);

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
    const currentStep = Math.floor(Date.now() / 5000);
    const token = Math.floor(((currentStep % 1000000) + 1000000) % 1000000).toString().padStart(6, '0');
    setCurrentToken(token);
  };

  useEffect(() => {
    if (sessionActive && sessionSecret) {
      generateToken(sessionSecret);
      const interval = setInterval(() => generateToken(sessionSecret), 5000);
      return () => clearInterval(interval);
    }
  }, [sessionActive, sessionSecret]);

  const fetchSessionAttendance = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/attendance/session/${id}`);
      const data = await response.json();
      if (data.success) setAttendanceList(data.records);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    }
  };

  useEffect(() => {
    if (sessionActive && sessionId) {
      fetchSessionAttendance(sessionId);
      const interval = setInterval(() => fetchSessionAttendance(sessionId), 3000);
      return () => clearInterval(interval);
    }
  }, [sessionActive, sessionId]);

  const enterClass = () => {
    if (!selectedDepartment || !selectedSemester || !selectedSubject) {
      showToast('Please select Department, Semester, and Subject.', 'error');
      return;
    }
    setClassStarted(true);
    setActivePage('attendance');
  };

  const startSession = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/session/create`, {
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
        showToast('Attendance session started!', 'success');
      } else {
        showToast('Failed to start session.', 'error');
      }
    } catch (err) {
      console.error('Session start error:', err);
      showToast('Cannot connect to backend.', 'error');
    }
  };

  const endSession = () => {
    fetch(`${API_BASE}/api/session/end`, { method: 'POST' }).catch(() => {});
    setSessionActive(false);
    setSessionId('');
    setSessionSecret('');
    setCurrentToken('');
    setManualCode('');
    setAttendanceList([]);
    setShowManualCode(false);
    showToast('Session ended.', 'success');
  };

  const qrValue = sessionActive ? `${sessionId}.${currentToken}` : '';

  // ---------- Notifications: global feed, sent by teachers ----------
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const response = await fetch(`${API_BASE}/api/notifications`);
      const data = await response.json();
      if (data.success) setSentNotifications(data.notifications);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    if (activePage === 'notifications' || activePage === 'dashboard') fetchNotifications();
  }, [activePage, fetchNotifications]);

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('Please fill in both title and message.', 'error');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/notifications/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notifTitle,
          message: notifMessage,
          createdBy: teacherName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Notification sent to everyone!', 'success');
        setNotifTitle('');
        setNotifMessage('');
        fetchNotifications();
      } else {
        showToast(data.message || 'Failed to send notification.', 'error');
      }
    } catch (err) {
      showToast('Cannot connect to backend.', 'error');
    } finally {
      setSending(false);
    }
  };

  // ---------- Attendance history (aggregated from current session records + past sessions if any) ----------
  const fetchAllHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      // We don't have a dedicated "all records" endpoint, so reuse the
      // current/last session's records as a starting point plus whatever
      // is already loaded from the live view.
      if (sessionId) {
        const response = await fetch(`${API_BASE}/api/attendance/session/${sessionId}`);
        const data = await response.json();
        if (data.success) setAllHistory(data.records);
      } else {
        setAllHistory(attendanceList);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [sessionId, attendanceList]);

  useEffect(() => {
    if (activePage === 'history') fetchAllHistory();
  }, [activePage, fetchAllHistory]);

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">+</span>
          <h2>Attend<span>+</span></h2>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => {
            const Ico = item.icon;
            return (
              <button
                key={item.id}
                className={`sidebar-link ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                <Ico size={18} className="sidebar-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="teacher-card">
            <div className="teacher-avatar"><IconUserIcon size={22} /></div>
            <div className="teacher-details">
              <strong>{teacherName}</strong>
              <p>Teacher</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <IconLogout size={16} /> Logout
          </button>
        </div>
      </aside>

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

        {activePage === 'dashboard' && (
          <div className="dashboard-overview ap-fade-in">
            <div className="welcome-banner">
              <h2>Welcome back, {teacherName}!</h2>
              <p>Here's what's happening in your classes today.</p>
            </div>

            <div className="section-card">
              <h3><IconTrendingUp size={17} /> Quick Actions</h3>
              <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => setActivePage('attendance')}>
                  <IconCheck size={20} /><strong>Start Attendance</strong>
                </button>
                <button className="quick-action-btn" onClick={() => setActivePage('notifications')}>
                  <IconSend size={20} /><strong>Post Notification</strong>
                </button>
                <button className="quick-action-btn" onClick={() => setActivePage('reports')}>
                  <IconTrendingUp size={20} /><strong>View Reports</strong>
                </button>
                <button className="quick-action-btn" onClick={() => setActivePage('history')}>
                  <IconCalendar size={20} /><strong>History</strong>
                </button>
              </div>
            </div>

            <div className="dashboard-grid ap-stagger">
              <div className="stat-card"><span className="stat-icon"><IconUsers size={22} /></span><div><h3>248</h3><p>Total Students</p></div></div>
              <div className="stat-card"><span className="stat-icon"><IconCheck size={22} /></span><div><h3>4</h3><p>Classes Today</p></div></div>
              <div className="stat-card"><span className="stat-icon"><IconTrendingUp size={22} /></span><div><h3>92%</h3><p>Avg Attendance</p></div></div>
              <div className="stat-card"><span className="stat-icon"><IconAlertCircle size={22} /></span><div><h3>14</h3><p>Absentees</p></div></div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3><IconBell size={17} /> Recently Sent Notifications</h3>
                <button className="link-btn" onClick={() => setActivePage('notifications')}>View all</button>
              </div>
              {loadingNotifs ? (
                <div className="ap-skeleton" style={{ height: 50, marginBottom: 10 }} />
              ) : sentNotifications.length === 0 ? (
                <p className="no-students">No notifications sent yet.</p>
              ) : (
                <ul className="sent-notif-list">
                  {sentNotifications.slice(0, 3).map((n) => (
                    <li key={n._id}>
                      <strong>{n.title}</strong>
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {!classStarted && activePage === 'attendance' && (
          <div className="class-selection-screen ap-scale-in">
            <div className="class-selection-card">
              <div className="selection-header">
                <span className="selection-icon"><IconUsers size={26} /></span>
                <h2>Select Your Class</h2>
                <p>Choose the class details</p>
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

              <button className="btn-primary btn-block" onClick={enterClass}>Enter Class</button>
            </div>
          </div>
        )}

        {classStarted && activePage === 'attendance' && (
          <div className="attendance-page ap-fade-in">
            <div className="class-header-banner">
              <div>
                <h2>{selectedSubject}</h2>
                <p>{selectedDepartment} • Semester {selectedSemester}</p>
              </div>
              <span className="class-live-badge">Live</span>
            </div>

            <div className="control-panel">
              <h2>Session Controls</h2>
              {!sessionActive ? (
                <button className="btn-primary btn-block" onClick={startSession}><IconPlay size={16} /> Start Attendance</button>
              ) : (
                <button className="btn-danger btn-block" onClick={endSession}><IconStop size={16} /> End Session</button>
              )}

              {sessionActive && (
                <button className="btn-secondary btn-block" onClick={() => setShowManualCode(!showManualCode)}>
                  {showManualCode ? 'Hide Manual Code' : 'Show Manual Code'}
                </button>
              )}

              {sessionActive && showManualCode && (
                <div className="manual-code-box">
                  <p className="manual-label">Manual Code</p>
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
                    <p className="qr-subtitle">{selectedDepartment} - {selectedSemester}</p>
                    <div className="qr-code-wrapper">
                      <QRCodeCanvas value={qrValue} size={250} level="H" />
                    </div>
                    <p className="qr-hint">QR refreshes every 5 seconds</p>
                  </>
                ) : (
                  <div className="qr-placeholder-empty">
                    <div className="qr-dashed-border"><span>QR Code will appear here</span></div>
                  </div>
                )}
              </div>

              <div className="attendance-section">
                <h3>Live Attendance ({attendanceList.length})</h3>
                {attendanceList.length === 0 ? (
                  <p className="no-students">No students checked in yet...</p>
                ) : (
                  <ul className="attendance-list">
                    {attendanceList.map((student, index) => (
                      <li key={index} className="attendance-item">
                        <div className="student-avatar"><IconUserIcon size={18} /></div>
                        <div className="student-info">
                          <strong>{student.studentName || student.name}</strong>
                          <p>{student.time}</p>
                        </div>
                        <span className="present-badge"><IconCheckCircle size={13} /> Present</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activePage === 'notifications' && (
          <div className="notifications-page ap-fade-in">
            <div className="notification-form-card">
              <h2><IconSend size={18} /> Post Notification</h2>
              <p className="muted-note">Notifications now always go out globally — every student sees every announcement.</p>
              <div className="input-group">
                <label>Title</label>
                <input type="text" className="text-input" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="e.g. Class Rescheduled" />
              </div>
              <div className="input-group">
                <label>Message</label>
                <textarea className="text-area" rows="4" value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} placeholder="Write your announcement..." />
              </div>
              <button className="btn-primary btn-block" onClick={sendNotification} disabled={sending}>
                <IconSend size={16} /> {sending ? 'Sending…' : 'Send to Everyone'}
              </button>
            </div>

            <div className="sent-notifications-card">
              <div className="section-header">
                <h3><IconBell size={17} /> Previously Sent</h3>
                <button className="view-all-btn" onClick={fetchNotifications}><IconRefresh size={15} /></button>
              </div>
              {loadingNotifs ? (
                <div className="ap-skeleton" style={{ height: 60, marginBottom: 10 }} />
              ) : sentNotifications.length === 0 ? (
                <p className="no-students">You haven't sent any notifications yet.</p>
              ) : (
                <div className="sent-notif-feed">
                  {sentNotifications.map((n) => (
                    <div key={n._id} className="sent-notif-item">
                      <div className="notification-dot"></div>
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <small>{new Date(n.createdAt).toLocaleString()} • by {n.createdBy || 'Teacher'} • {n.readBy?.length || 0} read</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activePage === 'history' && (
          <div className="placeholder-page ap-fade-in full-width">
            <div className="section-header">
              <h2><IconCalendar size={20} /> Attendance History</h2>
              <button className="view-all-btn" onClick={fetchAllHistory}><IconRefresh size={15} /></button>
            </div>
            {loadingHistory ? (
              <div className="ap-skeleton" style={{ height: 200 }} />
            ) : allHistory.length === 0 ? (
              <p className="no-students">Start or run a session to see attendance history here.</p>
            ) : (
              <ul className="attendance-list wide">
                {allHistory.map((student, index) => (
                  <li key={index} className="attendance-item">
                    <div className="student-avatar"><IconUserIcon size={18} /></div>
                    <div className="student-info">
                      <strong>{student.studentName || student.name}</strong>
                      <p>{student.date} • {student.time} • {student.subject}</p>
                    </div>
                    <span className="present-badge"><IconCheckCircle size={13} /> Present</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activePage === 'reports' && (
          <div className="placeholder-page ap-fade-in">
            <IconTrendingUp size={36} />
            <h2>Reports</h2>
            <p>Detailed attendance analytics are coming soon.</p>
          </div>
        )}

        {activePage === 'settings' && (
          <div className="placeholder-page ap-fade-in full-width settings-page">
            <h2><IconSettings size={20} /> Settings</h2>
            <div className="settings-list">
              <div className="settings-row">
                <div className="settings-row-label">
                  {theme === 'dark' ? <IconMoon size={18} /> : <IconSun size={18} />}
                  <div><strong>Dark Mode</strong><p>Switch between light and dark themes</p></div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={theme === 'dark'} onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')} />
                  <span className="slider" />
                </label>
              </div>
              <div className="settings-row static">
                <div className="settings-row-label"><IconUserIcon size={18} /><div><strong>Teacher</strong><p>{teacherName}</p></div></div>
              </div>
            </div>
            <button className="btn-danger" style={{ marginTop: 24 }} onClick={handleLogout}>
              <IconLogout size={16} /> Log out of Attend+
            </button>
          </div>
        )}
      </main>
      <nav className="bottom-nav-teacher">
        {sidebarItems.map((item) => {
          const Ico = item.icon;
          return (
            <button key={item.id} className={activePage === item.id ? 'active' : ''} onClick={() => setActivePage(item.id)}>
              <Ico size={18} />
              <small>{item.label.split(' ')[0]}</small>
            </button>
          );
        })}
      </nav>
      <ToastStack toasts={toasts} />
    </div>
  );
};

export default TeacherDashboard;
