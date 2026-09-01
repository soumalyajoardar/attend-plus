import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Landing.css';
import { isAuthed, getRole } from '../utils/auth';
import { IconCheckCircle, IconArrowRight, IconPlay, IconMenu, IconClose, IconQr, IconClock, IconShield, IconUsers } from '../components/Icons';
import ThemeToggle from '../components/ThemeToggle';

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // One-off confirmation banner shown after a student permanently deletes
  // their account. StudentDashboard navigates here with
  // `state: { accountDeleted: true, message }`; we surface it once, then
  // clear the history state so a refresh or back-nav doesn't replay it.
  const [deletedNotice, setDeletedNotice] = useState(
    location.state?.accountDeleted ? (location.state.message || 'Your account has been permanently deleted.') : ''
  );
  useEffect(() => {
    if (!location.state?.accountDeleted) return;
    navigate(location.pathname, { replace: true, state: {} });
    const t = setTimeout(() => setDeletedNotice(''), 7000);
    return () => clearTimeout(t);
  }, [location.state, navigate, location.pathname]);

  const dynamicWords = useMemo(() => ['Teaching.', 'Learning.', 'Achieving.', 'Growing.', 'Succeeding.', 'Innovating.', 'Collaborating.', 'Creating.', 'Inspiring.', 'Leading.', 'Empowering.', 'Transforming.', 'Excelling.', 'Advancing.', 'Exploring.', 'Discovering.', 'Building.', 'Sharing.', 'Connecting.', 'Celebrating.'], []);
  useEffect(() => {
    const currentWord = dynamicWords[wordIndex];
    let timeout;
    if (!isDeleting && displayText.length < currentWord.length) {
      timeout = setTimeout(() => setDisplayText(currentWord.slice(0, displayText.length + 1)), 90);
    } else if (!isDeleting && displayText.length === currentWord.length) {
      timeout = setTimeout(() => setIsDeleting(true), 3000);
    } else if (isDeleting && displayText.length > 0) {
      timeout = setTimeout(() => setDisplayText(currentWord.slice(0, displayText.length - 1)), 45);
    } else if (isDeleting && displayText.length === 0) {
      setIsDeleting(false);
      setWordIndex((i) => (i + 1) % dynamicWords.length);
    }
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, wordIndex, dynamicWords]);

  // Lock body scroll while the mobile slide-in menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLaunchDashboard = () => {
    if (isAuthed()) {
      const role = getRole();
      navigate(role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-container">
      {/* Post-deletion confirmation. Fixed-position on purpose: it must not
          push the navbar or hero down when it appears. Renders nothing at all
          in the normal case, so the page layout is untouched. */}
      {deletedNotice && (
        <div className="lp-deleted-banner" role="status">
          <IconCheckCircle size={18} />
          <span>{deletedNotice}</span>
          <button
            className="lp-deleted-dismiss"
            onClick={() => setDeletedNotice('')}
            aria-label="Dismiss this message"
          >
            <IconClose size={15} />
          </button>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <div className="logo-mark" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
              <rect width="48" height="48" rx="12" fill="url(#logoGrad)" />
              <path d="M14 30 L22 22 L26 26 L34 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="34" cy="18" r="4" fill="white" />
              <circle cx="14" cy="30" r="4" fill="white" />
            </svg>
          </div>
          <h2>Attend<span>+</span></h2>
        </div>
        {/* Full nav actions: shown inline on desktop/tablet */}
        <div className="nav-links">
          <ThemeToggle />
          <button className="btn-ghost" onClick={() => navigate('/credits')}>Credits</button>
          <button className="btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn-primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>

        {/* Mobile actions: theme toggle stays visible, next to the menu trigger */}
        <div className="nav-mobile-actions">
          <ThemeToggle />
          <button
            type="button"
            className="nav-menu-trigger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <IconMenu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile slide-in menu */}
      <div className={`nav-drawer-overlay ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`nav-drawer ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
          <div className="nav-drawer-header">
          <div className="logo">
            <div className="logo-mark" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGradDrawer" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0f766e" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
                <rect width="48" height="48" rx="12" fill="url(#logoGradDrawer)" />
                <path d="M14 30 L22 22 L26 26 L34 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <circle cx="34" cy="18" r="4" fill="white" />
                <circle cx="14" cy="30" r="4" fill="white" />
              </svg>
            </div>
            <h2>Attend<span>+</span></h2>
          </div>
          <button
            type="button"
            className="nav-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <IconClose size={20} />
          </button>
        </div>
        <div className="nav-drawer-body">
          <button
            className="btn-ghost nav-drawer-btn"
            onClick={() => { setMenuOpen(false); navigate('/login'); }}
          >
            Sign In
          </button>
          <button
            className="btn-primary nav-drawer-btn"
            onClick={() => { setMenuOpen(false); navigate('/signup'); }}
          >
            Get Started
          </button>
          <button
            className="btn-ghost nav-drawer-btn"
            onClick={() => { setMenuOpen(false); navigate('/credits'); }}
          >
            Credits
          </button>
        </div>
      </aside>

      {/* Hero Section */}
      <main className="hero">
        <div className="hero-text">
          <span className="badge">Simplified Attendance for Modern Institutes</span>
          <h1>Stop Wasting Time on Roll Calls. <br /> Start <span className="highlight typewriter-wrap">
            <span className="typewriter-text">{displayText}</span>
            <span className="typewriter-cursor"> </span>
          </span></h1>
          <p>
            Attend+ uses secure, dynamic QR codes to take attendance in seconds. 
            No more shouting names, no more paper sheets, and no more proxy attendance.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-lg" onClick={handleLaunchDashboard}>
              Launch Dashboard <IconArrowRight size={18} />
            </button>
            <button className="btn-secondary btn-lg" onClick={() => navigate('/login')}>
              <IconPlay size={18} /> Watch Demo
            </button>
          </div>
          <div className="stats">
            <div>
              <h3>5 Sec</h3>
              <p>Average Check-in Time</p>
            </div>
            <div className="divider"></div>
            <div>
              <h3>100%</h3>
              <p>Paperless Process</p>
            </div>
            <div className="divider"></div>
            <div>
              <h3>0</h3>
              <p>Proxy Attendance</p>
            </div>
          </div>
        </div>

        {/* Hero Visual — glass dashboard preview (replaces the narrow phone mockup) */}
        <div className="hero-visual">
          <div className="hero-dashboard">
            <div className="hero-dashboard-header">
              <span className="dash-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="dash-title">CS-4A · Data Structures</span>
              <span className="dash-live"><span className="live-dot" /> Live</span>
            </div>

            <div className="hero-dashboard-body">
              <div className="hero-qr-card">
                <div className="hero-qr-grid" aria-hidden="true">
                  <span /><span /><span /><span />
                  <span /><span className="white" /><span /><span />
                  <span /><span /><span className="white" /><span />
                  <span /><span /><span /><span />
                </div>
                <div className="hero-qr-meta">
                  <strong>Scan to mark present</strong>
                  <span>QR rotates every 5s · 10:00 AM</span>
                </div>
                <div className="hero-qr-foot">
                  <span className="hero-qr-pill"><IconShield size={12} /> Proxy-proof</span>
                  <span className="hero-qr-pill"><IconClock size={12} /> 6-digit fallback</span>
                </div>
              </div>

              <div className="hero-stats-col">
                <div className="hero-mini-stat">
                  <span className="hero-mini-icon"><IconUsers size={16} /></span>
                  <div>
                    <strong>27 / 32</strong>
                    <p>Present</p>
                  </div>
                  <span className="hero-mini-pct">84%</span>
                </div>
                <div className="hero-progress">
                  <div className="hero-progress-label"><span>Attendance</span><span>84%</span></div>
                  <div className="hero-progress-track"><i style={{ width: '84%' }} /></div>
                </div>
                <ul className="hero-live-list">
                  <li><span className="hero-live-dot" /> Rohan Sharma — just now</li>
                  <li><span className="hero-live-dot" /> Priya Das — 1m ago</li>
                  <li><span className="hero-live-dot" /> Aman Khan — 2m ago</li>
                </ul>
              </div>
            </div>

            <div className="hero-dashboard-footer">
              <span><IconQr size={13} /> Secure rotating code</span>
              <span><IconCheckCircle size={13} /> Marked present instantly</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          © 2026 Attend+. Built with ❤️ By the Attend+ Team ·{' '}
          <button type="button" className="footer-link" onClick={() => navigate('/credits')}>
            Credits
          </button>
        </p>
        <p className="footer-version">Pre-Alpha v1.1.3</p>
      </footer>
    </div>
  );
};

export default Landing;