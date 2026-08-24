import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from './QRScanner';
import ManualEntry from './ManualEntry';
import './StudentDashboard.css';
import { API_BASE } from '../utils/api';
import { clearSession, getUser } from '../utils/auth';
import { getTheme, setTheme as setGlobalTheme } from '../utils/theme';
import { useToast, ToastStack } from '../components/Toast';
import {
  IconHome, IconBell, IconQr, IconCalendar, IconUser, IconSettings, IconLogout,
  IconCheckCircle, IconRefresh, IconMoon, IconSun, IconIdCard,
  IconBuilding, IconLayers, IconMail, IconShield, IconTrendingUp, IconChevronRight,
  IconTrash, IconAlertCircle, IconClose,
} from '../components/Icons';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: IconHome },
  { id: 'notifications', label: 'Notifications', icon: IconBell },
  { id: 'history', label: 'History', icon: IconCalendar },
  { id: 'profile', label: 'Profile', icon: IconUser },
  { id: 'settings', label: 'Settings', icon: IconSettings },
];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const storedUser = getUser();
  const { toasts, showToast } = useToast();

  const [studentName] = useState(storedUser.fullName || 'Student');
  const [department] = useState(storedUser.department || 'CST');
  const [semester] = useState(storedUser.semester || '1st');
  const [registrationNo] = useState(storedUser.registrationNo || 'N/A');
  const [email] = useState(storedUser.email || '');

  const [activeSection, setActiveSection] = useState('home');
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Dark mode is shared app-wide (utils/theme.js); local state here just
  // mirrors it so this Settings toggle stays in sync with the toggle on
  // Landing/Login/Signup and the Teacher Dashboard.
  const [theme, setThemeState] = useState(getTheme());
  const setTheme = (next) => {
    setGlobalTheme(next);
    setThemeState(next);
  };
  const [prefSound, setPrefSound] = useState(localStorage.getItem('attendplus_pref_sound') !== '0');
  const [prefCompact, setPrefCompact] = useState(localStorage.getItem('attendplus_pref_compact') === '1');

  // ---------- Delete-account flow ----------
  // A confirm dialog gates the destructive call: the student must re-enter
  // their password AND type DELETE, mirroring the two checks the server does.
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail);
    window.addEventListener('attendplus-theme-change', onChange);
    return () => window.removeEventListener('attendplus-theme-change', onChange);
  }, []);

  // ---------- Notifications: global feed, no department/semester filter ----------
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const response = await fetch(`${API_BASE}/api/notifications`);
      const data = await response.json();
      if (data.success) setNotifications(data.notifications);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.readBy?.includes(registrationNo)).length;

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.readBy?.includes(registrationNo));
    if (!unread.length) return;
    try {
      await Promise.all(
        unread.map((n) =>
          fetch(`${API_BASE}/api/notifications/${n._id}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registrationNo }),
          })
        )
      );
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readBy: [...(n.readBy || []), registrationNo] }))
      );
    } catch {
      /* non-critical */
    }
  };

  // ---------- Attendance history ----------
  const fetchHistory = useCallback(async () => {
    if (registrationNo === 'N/A') return;
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE}/api/attendance/student/${registrationNo}`);
      const data = await response.json();
      if (data.success) setHistory(data.records);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [registrationNo]);

  useEffect(() => {
    if (activeSection === 'history' || activeSection === 'home') fetchHistory();
  }, [activeSection, fetchHistory]);

  const thisWeekCount = history.filter((r) => {
    const d = new Date(r.timestamp || r.createdAt);
    const now = new Date();
    const diffDays = (now - d) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  // Close the dialog and wipe whatever was typed, so a reopened dialog never
  // starts with a password still sitting in state.
  const closeDeleteDialog = () => {
    if (deleting) return; // don't let the user bail out mid-request
    setShowDeleteDialog(false);
    setDeletePassword('');
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const confirmPhraseOk = deleteConfirmText.trim().toUpperCase() === 'DELETE';
  const canSubmitDelete = confirmPhraseOk && deletePassword.length > 0 && !deleting;

  const handleDeleteAccount = async () => {
    if (!canSubmitDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`${API_BASE}/api/student/${storedUser.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        // Wrong password / demo account / already gone — keep the dialog open
        // so the student can correct it rather than losing what they typed.
        setDeleteError(data.message || 'Could not delete your account. Please try again.');
        setDeleting(false);
        return;
      }

      // Gone for good: drop the local session immediately so no stale login
      // survives, then hand them back to the landing page.
      clearSession();
      navigate('/', {
        replace: true,
        state: { accountDeleted: true, message: data.message },
      });
    } catch (err) {
      console.error('Delete account error:', err);
      setDeleteError('Could not reach the server. Check your connection and try again.');
      setDeleting(false);
    }
  };

  return (
    <div className={`student-container ${prefCompact ? 'compact' : ''}`}>
      <aside className="student-sidebar">
        <div className="student-logo">
          <span className="logo-icon">+</span>
          <h2>Attend<span>+</span></h2>
        </div>
        <nav className="student-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Ico = item.icon;
            return (
              <button
                key={item.id}
                className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <Ico size={19} />
                <span>{item.label}</span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="notification-badge inline">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="student-mini-card">
            <div className="student-avatar-small"><IconUser size={18} /></div>
            <div className="student-mini-details">
              <strong>{studentName}</strong>
              <p>{registrationNo}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <IconLogout size={17} /> Logout
          </button>
        </div>
      </aside>

      <main className="student-main">
        <header className="student-topbar">
          <h1>
            {activeSection === 'home' ? `Hello, ${studentName.split(' ')[0]}` :
             activeSection === 'notifications' ? 'Notifications' :
             activeSection === 'history' ? 'Attendance History' :
             activeSection === 'profile' ? 'My Profile' : 'Settings'}
          </h1>
          <div className="topbar-actions">
            <button className="scan-btn-top secondary" onClick={() => setShowManual(true)}>
              <IconIdCard size={17} /> Enter Code
            </button>
            <button className="scan-btn-top" onClick={() => setShowScanner(true)}>
              <IconQr size={17} /> Scan QR
            </button>
          </div>
        </header>

        {activeSection === 'home' && (
          <div className="ap-fade-in">
            <div className="student-welcome">
              <p>{department} • Semester {semester} • {registrationNo}</p>
            </div>

            <div className="home-stats ap-stagger">
              <div className="mini-stat">
                <span className="mini-stat-icon"><IconCheckCircle size={20} /></span>
                <div><h3>{history.length}</h3><p>Total Check-ins</p></div>
              </div>
              <div className="mini-stat">
                <span className="mini-stat-icon"><IconTrendingUp size={20} /></span>
                <div><h3>{thisWeekCount}</h3><p>This Week</p></div>
              </div>
              <div className="mini-stat">
                <span className="mini-stat-icon"><IconBell size={20} /></span>
                <div><h3>{unreadCount}</h3><p>Unread Alerts</p></div>
              </div>
            </div>

            <div className="student-content-grid">
              <div className="scan-stats-column">
                <div className="scan-section">
                  <button className="scan-btn" onClick={() => setShowScanner(true)}>
                    <span className="scan-icon"><IconQr size={26} /></span>
                    <span className="scan-text">
                      <strong>Scan QR Code</strong>
                      <small>Mark your attendance in seconds</small>
                    </span>
                    <IconChevronRight size={18} className="scan-chevron" />
                  </button>
                  <button className="manual-entry-link" onClick={() => setShowManual(true)}>
                    <IconIdCard size={16} /> QR not working? Enter the 6-digit code instead
                  </button>
                </div>
                <div className="recent-checkins">
                  <div className="section-header">
                    <h3>Recent Check-ins</h3>
                    <button className="link-btn" onClick={() => setActiveSection('history')}>View all</button>
                  </div>
                  {history.slice(0, 3).map((r) => (
                    <div key={r._id} className="mini-history-row">
                      <IconCheckCircle size={16} className="ok" />
                      <span>{r.subject}</span>
                      <small>{r.date}</small>
                    </div>
                  ))}
                  {!loadingHistory && history.length === 0 && (
                    <p className="loading-text">No check-ins yet. Scan a QR to get started!</p>
                  )}
                </div>
              </div>

              <div className="notifications-column">
                <div className="section-header">
                  <h3><IconBell size={16} /> Notifications</h3>
                  <button className="view-all-btn" onClick={fetchNotifications} title="Refresh">
                    <IconRefresh size={15} />
                  </button>
                </div>
                <div className="notification-list">
                  {loadingNotifications ? (
                    <div className="ap-skeleton" style={{ height: 60, marginBottom: 10 }} />
                  ) : notifications.length === 0 ? (
                    <p className="loading-text">No notifications yet.</p>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div key={notif._id} className={`notification-item ${!notif.readBy?.includes(registrationNo) ? 'unread' : ''}`}>
                        <div className="notification-dot"></div>
                        <div className="notification-content">
                          <strong>{notif.title}</strong>
                          <p>{notif.message}</p>
                          <small>{new Date(notif.createdAt).toLocaleString()} • {notif.createdBy || 'Teacher'}</small>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="ap-fade-in full-page-card">
            <div className="section-header">
              <h3><IconBell size={18} /> All Notifications</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="link-btn" onClick={markAllRead}>Mark all read</button>
                <button className="view-all-btn" onClick={fetchNotifications}><IconRefresh size={15} /></button>
              </div>
            </div>
            <p className="muted-note">These announcements are sent by your teachers to everyone — no department or semester filtering.</p>
            <div className="notification-list wide">
              {loadingNotifications ? (
                <div className="ap-skeleton" style={{ height: 70, marginBottom: 10 }} />
              ) : notifications.length === 0 ? (
                <p className="loading-text">No notifications yet.</p>
              ) : (
                notifications.map((notif) => (
                  <div key={notif._id} className={`notification-item ${!notif.readBy?.includes(registrationNo) ? 'unread' : ''}`}>
                    <div className="notification-dot"></div>
                    <div className="notification-content">
                      <strong>{notif.title}</strong>
                      <p>{notif.message}</p>
                      <small>{new Date(notif.createdAt).toLocaleString()} • {notif.createdBy || 'Teacher'}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSection === 'history' && (
          <div className="ap-fade-in full-page-card">
            <div className="section-header">
              <h3><IconCalendar size={18} /> Attendance History</h3>
              <button className="view-all-btn" onClick={fetchHistory}><IconRefresh size={15} /></button>
            </div>
            {loadingHistory ? (
              <div className="ap-skeleton" style={{ height: 200 }} />
            ) : history.length === 0 ? (
              <p className="loading-text">No attendance records yet.</p>
            ) : (
              <div className="history-table">
                <div className="history-row history-head">
                  <span>Subject</span><span>Department</span><span>Date</span><span>Time</span><span>Method</span>
                </div>
                {history.map((r) => (
                  <div key={r._id} className="history-row">
                    <span className="hist-subject"><IconCheckCircle size={14} className="ok" /> {r.subject}</span>
                    <span>{r.department} • Sem {r.semester}</span>
                    <span>{r.date}</span>
                    <span>{r.time}</span>
                    <span className={`method-pill ${r.method}`}>{r.method}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'profile' && (
          <div className="ap-fade-in full-page-card profile-card">
            <div className="profile-header">
              <div className="profile-avatar"><IconUser size={34} /></div>
              <div>
                <h2>{studentName}</h2>
                <p>{registrationNo}</p>
              </div>
            </div>
            <div className="profile-grid">
              <div className="profile-field"><IconIdCard size={17} /><div><small>Registration No.</small><strong>{registrationNo}</strong></div></div>
              <div className="profile-field"><IconBuilding size={17} /><div><small>Department</small><strong>{department}</strong></div></div>
              <div className="profile-field"><IconLayers size={17} /><div><small>Semester</small><strong>{semester}</strong></div></div>
              <div className="profile-field"><IconMail size={17} /><div><small>Email</small><strong>{email || '—'}</strong></div></div>
              <div className="profile-field"><IconMail size={17} /><div><small>Parent Email</small><strong>{storedUser.parentEmail || '—'}</strong></div></div>
              <div className="profile-field"><IconShield size={17} /><div><small>Account Type</small><strong>Student</strong></div></div>
            </div>
            <p className="muted-note">This is the information you provided while registering. Contact the admin to correct any details.</p>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="ap-fade-in full-page-card">
            <h3>Preferences</h3>
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
              <div className="settings-row">
                <div className="settings-row-label">
                  <IconBell size={18} />
                  <div><strong>Notification Sound</strong><p>Play a sound for new announcements</p></div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={prefSound} onChange={(e) => { setPrefSound(e.target.checked); localStorage.setItem('attendplus_pref_sound', e.target.checked ? '1' : '0'); }} />
                  <span className="slider" />
                </label>
              </div>
              <div className="settings-row">
                <div className="settings-row-label">
                  <IconLayers size={18} />
                  <div><strong>Compact Layout</strong><p>Reduce spacing for smaller screens</p></div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={prefCompact} onChange={(e) => { setPrefCompact(e.target.checked); localStorage.setItem('attendplus_pref_compact', e.target.checked ? '1' : '0'); }} />
                  <span className="slider" />
                </label>
              </div>
            </div>

            <h3 className="settings-section-gap">Account</h3>
            <div className="settings-list">
              <div className="settings-row static">
                <div className="settings-row-label"><IconIdCard size={18} /><div><strong>Registration No.</strong><p>{registrationNo}</p></div></div>
              </div>
              <div className="settings-row static">
                <div className="settings-row-label"><IconMail size={18} /><div><strong>Email</strong><p>{email || '—'}</p></div></div>
              </div>
            </div>
            <button className="btn-danger" style={{ marginTop: 24 }} onClick={handleLogout}>
              <IconLogout size={17} /> Log out of Attend+
            </button>

            {/* Danger zone: permanent account deletion */}
            <h3 className="settings-section-gap sd-danger-heading">
              <IconAlertCircle size={18} /> Danger Zone
            </h3>
            <div className="sd-danger-zone">
              <div className="sd-danger-copy">
                <strong>Delete my account</strong>
                <p>
                  Permanently removes your Attend+ profile and sign-in. This cannot be undone —
                  you would need to register again and wait for teacher approval.
                </p>
              </div>
              <button
                type="button"
                className="sd-danger-btn"
                onClick={() => setShowDeleteDialog(true)}
              >
                <IconTrash size={17} /> Delete account
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="student-bottom-nav">
        {NAV_ITEMS.map((item) => {
          const Ico = item.icon;
          return (
            <button key={item.id} className={activeSection === item.id ? 'active' : ''} onClick={() => setActiveSection(item.id)}>
              <Ico size={19} />
              <small>{item.label}</small>
            </button>
          );
        })}
      </nav>

      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onSuccess={(message) => {
            setShowScanner(false);
            showToast(message, 'success');
            fetchHistory();
          }}
        />
      )}

      {showManual && (
        <ManualEntry
          onClose={() => setShowManual(false)}
          onSuccess={(message) => {
            setShowManual(false);
            showToast(message, 'success');
            fetchHistory();
          }}
        />
      )}

      {showDeleteDialog && (
        <div
          className="sd-delete-overlay"
          onClick={closeDeleteDialog}
          role="presentation"
        >
          {/* stopPropagation so clicking inside the card doesn't dismiss it */}
          <div
            className="sd-delete-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sd-delete-title"
          >
            <div className="sd-delete-head">
              <span className="sd-delete-icon"><IconAlertCircle size={22} /></span>
              <h3 id="sd-delete-title">Delete your account?</h3>
              <button
                type="button"
                className="close-btn"
                onClick={closeDeleteDialog}
                aria-label="Cancel"
                disabled={deleting}
              >
                <IconClose size={18} />
              </button>
            </div>

            <p className="sd-delete-lead">
              This permanently deletes <strong>{studentName}</strong> ({registrationNo}). It cannot
              be undone.
            </p>

            {/* Being explicit about what survives avoids a nasty surprise, and
                explains why their name may still appear in a teacher's report. */}
            <ul className="sd-delete-facts">
              <li className="removed">Your profile and sign-in are removed</li>
              <li className="removed">You can no longer log in to Attend+</li>
              <li className="kept">
                Attendance already recorded for you stays on your college&apos;s records
              </li>
            </ul>

            <label className="sd-delete-label" htmlFor="sd-delete-pw">
              Confirm your password
            </label>
            <input
              id="sd-delete-pw"
              type="password"
              className="sd-delete-input"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
              placeholder="Your account password"
              autoComplete="current-password"
              disabled={deleting}
            />

            <label className="sd-delete-label" htmlFor="sd-delete-confirm">
              Type <code>DELETE</code> to confirm
            </label>
            <input
              id="sd-delete-confirm"
              type="text"
              className="sd-delete-input"
              value={deleteConfirmText}
              onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(''); }}
              placeholder="DELETE"
              autoComplete="off"
              disabled={deleting}
            />

            {deleteError && (
              <p className="sd-delete-error" role="alert">
                <IconAlertCircle size={15} /> {deleteError}
              </p>
            )}

            <div className="sd-delete-actions">
              <button
                type="button"
                className="sd-delete-cancel"
                onClick={closeDeleteDialog}
                disabled={deleting}
              >
                Keep my account
              </button>
              <button
                type="button"
                className="sd-danger-btn"
                onClick={handleDeleteAccount}
                disabled={!canSubmitDelete}
              >
                {deleting
                  ? 'Deleting…'
                  : <><IconTrash size={17} /> Permanently delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
};

export default StudentDashboard;
