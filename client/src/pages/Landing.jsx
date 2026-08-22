import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';
import { isRemembered, getRole } from '../utils/auth';
import { IconBell, IconCheckCircle, IconArrowRight, IconPlay, IconMenu, IconClose } from '../components/Icons';
import ThemeToggle from '../components/ThemeToggle';

const Landing = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
      timeout = setTimeout(() => setIsDeleting(true), 1200);
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
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">+</span> 
          <h2>Attend<span>+</span></h2>
        </div>
        {/* Full nav actions: shown inline on desktop/tablet */}
        <div className="nav-links">
          <ThemeToggle />
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
        </div>
      </aside>

      {/* Hero Section */}
      <main className="hero">
        <div className="hero-text">
          <span className="badge">Simplified Attendance for Modern Institutes</span>
          <h1>Stop Wasting Time on Roll Calls. <br /> Start <span className="highlight typewriter-wrap">
            <span className="typewriter-text">{displayText}</span>
            <span className="typewriter-cursor">|</span>
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

        {/* Hero Visual / Mockup */}
        <div className="hero-visual">
          <div className="phone-mockup">
            <div className="phone-header">
              <span className="camera-dot"></span>
            </div>
            <div className="phone-screen">
              <div className="qr-placeholder">
                <div className="fake-qr">
                  <div className="qr-row"><span></span><span></span><span></span><span></span></div>
                  <div className="qr-row"><span></span><span className="white"></span><span></span><span></span></div>
                  <div className="qr-row"><span></span><span></span><span className="white"></span><span></span></div>
                  <div className="qr-row"><span></span><span></span><span></span><span></span></div>
                </div>
              </div>
              <h4 className="mock-title">Scan to Attend</h4>
              <p className="mock-sub">Data Structures - 10:00 AM</p>
              <div className="mock-success">
                <span className="green-dot"></span> Marked Present
              </div>
            </div>
          </div>
          
          {/* Floating elements for design */}
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
        <p>© 2026 Attend+. Built for Educators.</p>
      </footer>
    </div>
  );
};

export default Landing;