import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Landing.css';
import { isRemembered, getRole } from '../utils/auth';
import { IconCheckCircle, IconArrowRight, IconPlay, IconMenu, IconClose, IconQr, IconClock, IconShield, IconUsers, IconChart, IconSend, IconLayers } from '../components/Icons';
import ThemeToggle from '../components/ThemeToggle';

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('accurate');

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

  const heroHighlights = ['accurate', 'instant', 'secure', 'paperless'];
  useEffect(() => {
    const t = setInterval(() => setWordIndex((i) => (i + 1) % heroHighlights.length), 2200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setDisplayText(heroHighlights[wordIndex]);
  }, [wordIndex]);

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
          <span className="badge"><span className="badge-dot" /> Trusted by faculty & students</span>
          <h1>Attendance that is <br /><span className="highlight highlight-anim">{displayText}</span>.</h1>
          <p className="hero-lead">
            Secure rotating QR + 6-digit fallback. No proxies, no paper, no wasted lecture time.
            Built for real classrooms — fast, reliable, and audit-ready.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-lg" onClick={handleLaunchDashboard}>
              Launch Dashboard <IconArrowRight size={18} />
            </button>
            <button className="btn-secondary btn-lg" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
              <IconPlay size={18} /> How it works
            </button>
          </div>
          <ul className="hero-trust">
            <li><IconShield size={14} /> Proxy-proof</li>
            <li><IconClock size={14} /> 5-sec check-in</li>
            <li><IconCheckCircle size={14} /> Paperless</li>
          </ul>
          <div className="stats">
            <div>
              <h3>5s</h3>
              <p>Avg. check-in</p>
            </div>
            <div className="divider"></div>
            <div>
              <h3>100%</h3>
              <p>Paperless</p>
            </div>
            <div className="divider"></div>
            <div>
              <h3>0</h3>
              <p>Proxy attendance</p>
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

      {/* Features */}
      <section className="lp-section" aria-labelledby="features-heading">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <h2 id="features-heading">Built for how classes actually run</h2>
            <p>No extra hardware. No spreadsheets. Just a session code and a scan.</p>
          </div>
          <div className="lp-features">
            <div className="lp-feature">
              <span className="lp-feature-icon"><IconQr size={20} /></span>
              <h3>Rotating QR, every 5s</h3>
              <p>Each session derives a new code from a per-session secret. Screenshots and forwards expire instantly.</p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-icon"><IconShield size={20} /></span>
              <h3>Proxy-proof by design</h3>
              <p>Time-bound verification on the server, plus a 30s manual 6-digit fallback when the camera fails.</p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-icon"><IconChart size={20} /></span>
              <h3>Reports you can use</h3>
              <p>Department, semester, and subject filters, defaulter lists, and one-click CSV for records.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="lp-section lp-section-alt" aria-labelledby="hiw-heading">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <h2 id="hiw-heading">Three steps. Under a minute.</h2>
            <p>Teachers start a session. Students check in. Everyone moves on.</p>
          </div>
          <ol className="lp-steps">
            <li>
              <span className="lp-step-num">01</span>
              <div>
                <h3>Teacher starts session</h3>
                <p>Select department, semester, subject → get a live QR and manual code. No setup beyond that.</p>
              </div>
            </li>
            <li>
              <span className="lp-step-num">02</span>
              <div>
                <h3>Students scan or enter code</h3>
                <p>QR via camera or 6 digits typed in. Verified instantly against the session secret.</p>
              </div>
            </li>
            <li>
              <span className="lp-step-num">03</span>
              <div>
                <h3>Attendance is recorded</h3>
                <p>Live list updates, history is saved, and reports stay accurate all semester.</p>
              </div>
            </li>
          </ol>
          <div className="lp-cta">
            <button className="btn-primary btn-lg" onClick={handleLaunchDashboard}>Get started — it’s free <IconArrowRight size={18} /></button>
            <span className="lp-cta-note"><IconLayers size={14} /> No credit card · Approval-based student access</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer footer-pro">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-icon">+</span>
              <h2>Attend<span>+</span></h2>
            </div>
            <p>Paperless attendance for modern institutes. Secure, fast, and built for real classrooms.</p>
          </div>
          <div className="footer-links">
            <div>
              <h4>Product</h4>
              <button type="button" className="footer-link" onClick={handleLaunchDashboard}>Launch Dashboard</button>
              <button type="button" className="footer-link" onClick={() => navigate('/login')}>Sign In</button>
              <button type="button" className="footer-link" onClick={() => navigate('/signup')}>Create Account</button>
            </div>
            <div>
              <h4>Resources</h4>
              <button type="button" className="footer-link" onClick={() => navigate('/credits')}>Credits & Team</button>
              <a className="footer-link" href="#how-it-works">How it works</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Attend+ · Group 8, SGP Major Project</p>
          <span className="footer-meta">Built for institute use · Approval-gated access</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;