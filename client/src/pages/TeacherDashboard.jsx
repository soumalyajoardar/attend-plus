import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import './TeacherDashboard.css';
import { API_BASE } from '../utils/api';
import { clearSession, getUser } from '../utils/auth';
import { getTheme, setTheme as setGlobalTheme } from '../utils/theme';
import { useToast, ToastStack } from '../components/Toast';
import {
  IconChart, IconCheck, IconBell, IconCalendar, IconTrendingUp, IconSettings,
  IconUsers, IconAlertCircle, IconSend, IconPlay, IconStop, IconLogout,
  IconRefresh, IconMoon, IconSun, IconCheckCircle, IconUser as IconUserIcon,
  IconDownload, IconIdCard, IconClose, IconClock,
} from '../components/Icons';

// Rotating-code derivation — the exact twin of deriveCode() in server.js, but
// using the browser's Web Crypto API. The teacher's browser holds the session
// secret (received when the session was created) and renders the codes; the
// server derives the same values to verify a check-in. `kind` is 'q' for the
// 5-second QR token and 'm' for the 30-second manual code. A parity test
// confirms this produces byte-identical output to the server.
async function deriveCode(secret, step, kind) {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw', enc.encode(String(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await window.crypto.subtle.sign('HMAC', key, enc.encode(`${kind}.${step}`));
  const h = new Uint8Array(sig);
  const offset = h[h.length - 1] & 0x0f;
  const bin =
    ((h[offset] & 0x7f) << 24) |
    ((h[offset + 1] & 0xff) << 16) |
    ((h[offset + 2] & 0xff) << 8) |
    (h[offset + 3] & 0xff);
  return String(bin % 1000000).padStart(6, '0');
}

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: IconChart },
  { id: 'attendance', label: 'Start Attendance', icon: IconCheck },
  { id: 'approvals', label: 'Approvals', icon: IconIdCard },
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
  const [manualSecondsLeft, setManualSecondsLeft] = useState(30);
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
  const [histFilters, setHistFilters] = useState({ department: '', semester: '', subject: '' });

  // Student approval queue
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [reviewingId, setReviewingId] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Reports
  const [reportRows, setReportRows] = useState([]);
  const [reportSessions, setReportSessions] = useState([]);
  const [reportMeta, setReportMeta] = useState({ totalHeld: 0, totalStudents: 0 });
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportFilters, setReportFilters] = useState({ department: '', semester: '', subject: '' });
  const [defaulterThreshold, setDefaulterThreshold] = useState(75);
  const [reportView, setReportView] = useState('students'); // 'students' | 'defaulters' | 'sessions'

  // Dark mode is shared app-wide (utils/theme.js); this just mirrors it into
  // local state so the Settings toggle here reflects/updates the same value
  // used on Landing, Login, Signup, and the Student Dashboard.
  const [theme, setThemeState] = useState(getTheme());
  const setTheme = (next) => {
    setGlobalTheme(next);
    setThemeState(next);
  };

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail);
    window.addEventListener('attendplus-theme-change', onChange);
    return () => window.removeEventListener('attendplus-theme-change', onChange);
  }, []);

  const generateManualCodeFallback = () => {
    // Only used if Web Crypto is somehow unavailable; the real code is derived.
    return '------';
  };

  // Single ticker (1s) that keeps both rotating codes and the manual countdown
  // fresh while a session is live. The QR token advances every 5s and the
  // manual code every 30s; we only recompute when the relevant time-step
  // actually changes, so this is cheap. Both are derived from the session
  // secret via HMAC so the server can verify them (see deriveCode above).
  useEffect(() => {
    if (!sessionActive || !sessionSecret) return;
    let cancelled = false;
    let lastQrStep = null;
    let lastManualStep = null;

    const tick = async () => {
      const now = Date.now();
      const qrStep = Math.floor(now / 5000);
      const manualStep = Math.floor(now / 30000);

      if (qrStep !== lastQrStep) {
        lastQrStep = qrStep;
        try {
          const t = await deriveCode(sessionSecret, qrStep, 'q');
          if (!cancelled) setCurrentToken(t);
        } catch { if (!cancelled) setCurrentToken(''); }
      }
      if (manualStep !== lastManualStep) {
        lastManualStep = manualStep;
        try {
          const c = await deriveCode(sessionSecret, manualStep, 'm');
          if (!cancelled) setManualCode(c);
        } catch { if (!cancelled) setManualCode(generateManualCodeFallback()); }
      }
      const secsLeft = Math.max(1, Math.ceil(((manualStep + 1) * 30000 - now) / 1000));
      if (!cancelled) setManualSecondsLeft(secsLeft);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(interval); };
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
        // QR token and manual code are now derived by the ticker effect from
        // data.secret — no need to seed them here.
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
    fetch(`${API_BASE}/api/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    setSessionActive(false);
    setSessionId('');
    setSessionSecret('');
    setCurrentToken('');
    setManualCode('');
    setManualSecondsLeft(30);
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

  // ---------- Attendance history (every past session, filterable) ----------
  const fetchAllHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      if (histFilters.department) params.set('department', histFilters.department);
      if (histFilters.semester) params.set('semester', histFilters.semester);
      if (histFilters.subject) params.set('subject', histFilters.subject);
      const response = await fetch(`${API_BASE}/api/attendance/all?${params.toString()}`);
      const data = await response.json();
      if (data.success) setAllHistory(data.records);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [histFilters]);

  useEffect(() => {
    if (activePage === 'history') fetchAllHistory();
  }, [activePage, fetchAllHistory]);

  // ---------- Student approvals ----------
  const fetchPendingStudents = useCallback(async () => {
    setLoadingApprovals(true);
    try {
      const response = await fetch(`${API_BASE}/api/students/pending`);
      const data = await response.json();
      if (data.success) {
        setPendingStudents(data.students);
        setPendingCount(data.students.length);
      }
    } catch (err) {
      console.error('Fetch pending students error:', err);
    } finally {
      setLoadingApprovals(false);
    }
  }, []);

  // Keep the sidebar badge current: refresh the pending count on load and
  // whenever the teacher opens the dashboard or approvals page.
  useEffect(() => {
    if (activePage === 'approvals' || activePage === 'dashboard') fetchPendingStudents();
  }, [activePage, fetchPendingStudents]);

  const reviewStudent = async (id, action) => {
    setReviewingId(id);
    try {
      const response = await fetch(`${API_BASE}/api/students/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewedBy: teacherName }),
      });
      const data = await response.json();
      if (data.success) {
        setPendingStudents((prev) => prev.filter((s) => s._id !== id));
        setPendingCount((c) => Math.max(0, c - 1));
        showToast(action === 'approve' ? 'Student approved.' : 'Registration rejected.', 'success');
      } else {
        showToast(data.message || 'Could not update the registration.', 'error');
      }
    } catch (err) {
      showToast('Cannot connect to backend.', 'error');
    } finally {
      setReviewingId('');
    }
  };

  // ---------- Reports ----------
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const params = new URLSearchParams();
      if (reportFilters.department) params.set('department', reportFilters.department);
      if (reportFilters.semester) params.set('semester', reportFilters.semester);
      if (reportFilters.subject) params.set('subject', reportFilters.subject);
      const [summaryRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/summary?${params.toString()}`),
        fetch(`${API_BASE}/api/reports/sessions?${params.toString()}`),
      ]);
      const summary = await summaryRes.json();
      const sessions = await sessionsRes.json();
      if (summary.success) {
        setReportRows(summary.report);
        setReportMeta({ totalHeld: summary.totalHeld, totalStudents: summary.totalStudents });
      }
      if (sessions.success) setReportSessions(sessions.sessions);
    } catch (err) {
      console.error('Fetch reports error:', err);
      showToast('Could not load reports.', 'error');
    } finally {
      setLoadingReports(false);
    }
  }, [reportFilters]);

  useEffect(() => {
    if (activePage === 'reports') fetchReports();
  }, [activePage, fetchReports]);

  // Build a CSV from whatever report view is active and trigger a download.
  const exportReportCsv = () => {
    let headers = [];
    let lines = [];
    let name = 'attendance-report';

    if (reportView === 'sessions') {
      name = 'sessions-report';
      headers = ['Session ID', 'Subject', 'Department', 'Semester', 'Date', 'Present', 'Enrolled', 'Absent', 'Status'];
      lines = reportSessions.map((s) => [
        s.sessionId, s.subject, s.department, s.semester, s.date, s.present, s.enrolled, s.absent, s.active ? 'Live' : 'Ended',
      ]);
    } else {
      const rows = reportView === 'defaulters'
        ? reportRows.filter((r) => r.percentage < defaulterThreshold)
        : reportRows;
      name = reportView === 'defaulters' ? `defaulters-below-${defaulterThreshold}` : 'attendance-percentage';
      headers = ['Registration No', 'Name', 'Department', 'Semester', 'Attended', 'Held', 'Percentage'];
      lines = rows.map((r) => [
        r.registrationNo, r.fullName, r.department, r.semester, r.attended, r.held, `${r.percentage}%`,
      ]);
    }

    const esc = (v) => {
      const str = String(v ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csv = [headers, ...lines].map((row) => row.map(esc).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
                {item.id === 'approvals' && pendingCount > 0 && (
                  <span className="notification-badge inline">{pendingCount}</span>
                )}
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
             activePage === 'approvals' ? 'Student Approvals' :
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
                  <div className="manual-countdown">
                    <span className="manual-countdown-bar" style={{ width: `${(manualSecondsLeft / 30) * 100}%` }} />
                  </div>
                  <p className="manual-refresh-hint"><IconClock size={12} /> Refreshes in {manualSecondsLeft}s</p>
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

        {activePage === 'approvals' && (
          <div className="approvals-page ap-fade-in full-width">
            <div className="section-card">
              <div className="section-header">
                <h3><IconIdCard size={17} /> Pending Registrations {pendingCount > 0 && <span className="count-chip">{pendingCount}</span>}</h3>
                <button className="view-all-btn" onClick={fetchPendingStudents} title="Refresh"><IconRefresh size={15} /></button>
              </div>
              <p className="muted-note">New student sign-ups appear here. A student can only log in once you approve them.</p>

              {loadingApprovals ? (
                <div className="ap-skeleton" style={{ height: 120 }} />
              ) : pendingStudents.length === 0 ? (
                <div className="empty-state">
                  <IconCheckCircle size={30} />
                  <p className="no-students">No registrations waiting. You're all caught up.</p>
                </div>
              ) : (
                <div className="approval-list">
                  {pendingStudents.map((s) => (
                    <div key={s._id} className="approval-item">
                      <div className="approval-avatar"><IconUserIcon size={20} /></div>
                      <div className="approval-info">
                        <strong>{s.fullName}</strong>
                        <p>{s.registrationNo} · {s.department} · Sem {s.semester}</p>
                        <small>{s.email}{s.parentEmail ? ` · parent: ${s.parentEmail}` : ''}</small>
                      </div>
                      <div className="approval-actions">
                        <button
                          className="approve-btn"
                          disabled={reviewingId === s._id}
                          onClick={() => reviewStudent(s._id, 'approve')}
                        >
                          <IconCheck size={15} /> Approve
                        </button>
                        <button
                          className="reject-btn"
                          disabled={reviewingId === s._id}
                          onClick={() => reviewStudent(s._id, 'reject')}
                        >
                          <IconClose size={15} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activePage === 'history' && (
          <div className="history-page ap-fade-in full-width">
            <div className="section-header">
              <h2><IconCalendar size={20} /> Attendance History</h2>
              <button className="view-all-btn" onClick={fetchAllHistory}><IconRefresh size={15} /></button>
            </div>

            <div className="filter-bar">
              <select value={histFilters.department} onChange={(e) => setHistFilters((f) => ({ ...f, department: e.target.value }))}>
                <option value="">All Departments</option>
                <option value="CST">CST</option><option value="ETCE">ETCE</option><option value="EIE">EIE</option>
                <option value="CIVIL">CIVIL</option><option value="MECHANICAL">MECHANICAL</option><option value="EE">EE</option>
              </select>
              <select value={histFilters.semester} onChange={(e) => setHistFilters((f) => ({ ...f, semester: e.target.value }))}>
                <option value="">All Semesters</option>
                <option value="1st">1st</option><option value="2nd">2nd</option><option value="3rd">3rd</option>
                <option value="4th">4th</option><option value="5th">5th</option><option value="6th">6th</option>
              </select>
              <select value={histFilters.subject} onChange={(e) => setHistFilters((f) => ({ ...f, subject: e.target.value }))}>
                <option value="">All Subjects</option>
                <option>Data Structures</option><option>Algorithms</option><option>Mathematics</option>
                <option>Physics</option><option>English</option>
              </select>
            </div>

            {loadingHistory ? (
              <div className="ap-skeleton" style={{ height: 200 }} />
            ) : allHistory.length === 0 ? (
              <p className="no-students">No attendance records match these filters yet.</p>
            ) : (
              <div className="history-table teacher">
                <div className="history-row history-head">
                  <span>Student</span><span>Reg. No</span><span>Class</span><span>Subject</span><span>Date · Time</span><span>Method</span>
                </div>
                {allHistory.map((r, index) => (
                  <div key={r._id || index} className="history-row">
                    <span className="hist-subject"><IconUserIcon size={14} /> {r.studentName || r.name}</span>
                    <span>{r.registrationNo}</span>
                    <span>{r.department} · Sem {r.semester}</span>
                    <span>{r.subject}</span>
                    <span>{r.date} · {r.time}</span>
                    <span className={`method-pill ${r.method}`}>{r.method}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activePage === 'reports' && (
          <div className="reports-page ap-fade-in full-width">
            <div className="section-header">
              <h2><IconTrendingUp size={20} /> Reports</h2>
              <div className="report-header-actions">
                <button className="view-all-btn" onClick={fetchReports} title="Refresh"><IconRefresh size={15} /></button>
                <button className="btn-secondary export-btn" onClick={exportReportCsv} disabled={loadingReports}>
                  <IconDownload size={15} /> Export CSV
                </button>
              </div>
            </div>

            <div className="report-meta-row">
              <div className="report-meta-card"><h3>{reportMeta.totalHeld}</h3><p>Classes Held</p></div>
              <div className="report-meta-card"><h3>{reportMeta.totalStudents}</h3><p>Students</p></div>
              <div className="report-meta-card">
                <h3>{reportRows.filter((r) => r.percentage < defaulterThreshold).length}</h3>
                <p>Below {defaulterThreshold}%</p>
              </div>
            </div>

            <div className="filter-bar">
              <select value={reportFilters.department} onChange={(e) => setReportFilters((f) => ({ ...f, department: e.target.value }))}>
                <option value="">All Departments</option>
                <option value="CST">CST</option><option value="ETCE">ETCE</option><option value="EIE">EIE</option>
                <option value="CIVIL">CIVIL</option><option value="MECHANICAL">MECHANICAL</option><option value="EE">EE</option>
              </select>
              <select value={reportFilters.semester} onChange={(e) => setReportFilters((f) => ({ ...f, semester: e.target.value }))}>
                <option value="">All Semesters</option>
                <option value="1st">1st</option><option value="2nd">2nd</option><option value="3rd">3rd</option>
                <option value="4th">4th</option><option value="5th">5th</option><option value="6th">6th</option>
              </select>
              <select value={reportFilters.subject} onChange={(e) => setReportFilters((f) => ({ ...f, subject: e.target.value }))}>
                <option value="">All Subjects</option>
                <option>Data Structures</option><option>Algorithms</option><option>Mathematics</option>
                <option>Physics</option><option>English</option>
              </select>
            </div>

            <div className="report-tabs">
              <button className={reportView === 'students' ? 'active' : ''} onClick={() => setReportView('students')}>All Students</button>
              <button className={reportView === 'defaulters' ? 'active' : ''} onClick={() => setReportView('defaulters')}>Defaulters</button>
              <button className={reportView === 'sessions' ? 'active' : ''} onClick={() => setReportView('sessions')}>Sessions</button>
              {reportView === 'defaulters' && (
                <label className="threshold-picker">
                  Below
                  <select value={defaulterThreshold} onChange={(e) => setDefaulterThreshold(Number(e.target.value))}>
                    <option value={85}>85%</option><option value={75}>75%</option>
                    <option value={65}>65%</option><option value={50}>50%</option>
                  </select>
                </label>
              )}
            </div>

            {loadingReports ? (
              <div className="ap-skeleton" style={{ height: 240 }} />
            ) : reportView === 'sessions' ? (
              reportSessions.length === 0 ? (
                <p className="no-students">No sessions held yet. Run an attendance session to populate this.</p>
              ) : (
                <div className="report-table">
                  <div className="report-row report-head">
                    <span>Subject</span><span>Class</span><span>Date</span><span>Present</span><span>Absent</span><span>Status</span>
                  </div>
                  {reportSessions.map((s) => (
                    <div key={s.sessionId} className="report-row">
                      <span className="rep-strong">{s.subject}</span>
                      <span>{s.department} · Sem {s.semester}</span>
                      <span>{s.date}</span>
                      <span className="rep-present">{s.present}</span>
                      <span className="rep-absent">{s.absent}</span>
                      <span className={`status-pill ${s.active ? 'live' : 'ended'}`}>{s.active ? 'Live' : 'Ended'}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              (() => {
                const rows = reportView === 'defaulters'
                  ? reportRows.filter((r) => r.percentage < defaulterThreshold)
                  : reportRows;
                if (rows.length === 0) {
                  return <p className="no-students">{reportView === 'defaulters' ? `No students below ${defaulterThreshold}%. ` : 'No data yet. '}Approve students and run sessions to see percentages.</p>;
                }
                return (
                  <div className="report-table">
                    <div className="report-row report-head">
                      <span>Student</span><span>Reg. No</span><span>Class</span><span>Attended</span><span>Held</span><span>%</span>
                    </div>
                    {rows.map((r) => (
                      <div key={r.registrationNo} className="report-row">
                        <span className="rep-strong">{r.fullName}</span>
                        <span>{r.registrationNo}</span>
                        <span>{r.department} · Sem {r.semester}</span>
                        <span>{r.attended}</span>
                        <span>{r.held}</span>
                        <span>
                          <span className={`pct-badge ${r.percentage < defaulterThreshold ? 'low' : r.percentage < 85 ? 'mid' : 'high'}`}>
                            {r.percentage}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
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
