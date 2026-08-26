import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Landing.css';
import { isRemembered, getRole } from '../utils/auth';
import { IconBell, IconCheckCircle, IconArrowRight, IconPlay, IconMenu, IconClose, IconQr, IconClock, IconShield, IconUsers } from '../components/Icons';
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
    // Wipe the flag from history so the banner can't reappear on reload.
    window.history.replaceState({}, document.title);
    const t = setTimeout(() => setDeletedNotice(''), 7000);
    return () => clearTimeout(t);
  }, [location.state]);

  const dynamicWords = ['Teaching.', 'Learning.', 'Achieving.', 'Growing.', 'Succeeding.', 'Innovating.', 'Collaborating.', 'Creating.', 'Inspiring.', 'Leading.', 'Empowering.', 'Transforming.', 'Excelling.', 'Advancing.', 'Exploring.', 'Discovering.', 'Building.', 'Sharing.', 'Connecting.', 'Celebrating.'];

  // Typewriter effect: types the word out, pauses, deletes it, moves to the
  // next word, and loops forever.
  useEffect(() => {
    const currentWord = dynamicWords[wordIndex];
    let timeout;

    if (!isDeleting && displayText.length < currentWord.length) {
      // typing
      timeout = setTimeout(() => {
        setDisplayText(currentWord.slice(0, displayText.length + 1));
      }, 90);
    } else if (!isDeleting && displayText.length === currentWord.length) {
      // pause at full word before deleting
      timeout = setTimeout(() => setIsDeleting(true), 3000);
    } else if (isDeleting && displayText.length > 0) {
      // deleting
      timeout = setTimeout(() => {
        setDisplayText(currentWord.slice(0, displayText.length - 1));
      }, 45);
    } else if (isDeleting && displayText.length === 0) {
      // move to next word
      setIsDeleting(false);
      setWordIndex((i) => (i + 1) % dynamicWords.length);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, wordIndex]);

  // Lock body scroll while the mobile slide-in menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // "Remember Me" flow: if the user previously logged in and asked to be
  // remembered, jump straight into their dashboard instead of the login page.
  const handleLaunchDashboard = () => {
    if (isRemembered()) {
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
          <span className="logo-icon">+</span> 
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
            <span className="logo-icon">+</span>
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
            <button className="btn-secondary btn-lg">
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

          {/* Floating accents — glassy, kept for depth */}
          <div className="float-card float-top">
            <span className="icon"><IconBell size={18} /></span>
            <div>
              <strong>Class Started</strong>
              <p>CS-4A • 32 Students Present</p>
            </div>
          </div>
          <div className="float-card float-bottom">
            <span className="icon"><IconCheckCircle size={18} /></span>
            <div>
              <strong>Rohan Sharma</strong>
              <p>Checked in 2 mins ago</p>
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
      </footer>
    </div>
  );
};

export default Landing;