import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css'; 

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">+</span> 
          <h2>Attend<span>+</span></h2>
        </div>
        <div className="nav-links">
          <button className="btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn-primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="hero">
        <div className="hero-text">
          <span className="badge">Simplified Attendance for Modern Institutes</span>
          <h1>Stop Wasting Time on Roll Calls. <br /> Start <span className="highlight">Teaching.</span></h1>
          <p>
            Attend+ uses secure, dynamic QR codes to take attendance in seconds. 
            No more shouting names, no more paper sheets, and no more proxy attendance.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-lg" onClick={() => navigate('/signup')}>
              Launch Dashboard →
            </button>
            <button className="btn-secondary btn-lg">
              ▶ Watch Demo
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
            <span className="icon">🔔</span> 
            <div>
              <strong>Class Started</strong>
              <p>CS-4A • 32 Students Present</p>
            </div>
          </div>
          <div className="float-card float-bottom">
            <span className="icon">✅</span> 
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