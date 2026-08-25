import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';
import './Credits.css';
import ThemeToggle from '../components/ThemeToggle';
import {
  IconArrowLeft, IconUsers, IconPhone, IconLayers, IconEye, IconSettings,
} from '../components/Icons';

/*
  Credits page (/credits)
  ----------------------------------------------------------------------
  Reached from the "Credits" link in the landing-page nav and footer.
  Reuses the landing navbar/footer classes so the page reads as part of
  the same site; every class added here is namespaced `credits-` because
  all page CSS in this app is bundled globally.

  The roster keeps the roman numerals from the project report (i–v) —
  they're the ordering the team already uses, not decoration.
*/

const CONTRIBUTORS = [
  { numeral: '1.',   name: 'Poulami Paul',    role: 'Project Manager',  initials: 'PP', icon: IconUsers },
  { numeral: '2.',  name: 'Soumalya Joardar', role: 'Frontend',        initials: 'SJ', icon: IconPhone },
  { numeral: '3.', name: 'Sanchari Kundu',  role: 'Database',         initials: 'SK', icon: IconLayers },
  { numeral: '4.',  name: 'Ankita Sarkar',   role: 'UI/UX Design',     initials: 'AS', icon: IconEye },
  { numeral: '5.',   name: 'Dipayan Nag',     role: 'Backend',          initials: 'DN', icon: IconSettings },
];

const Credits = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navigation — mirrors the landing page so the header doesn't jump */}
      <nav className="navbar">
        <button
          type="button"
          className="logo credits-logo-btn"
          onClick={() => navigate('/')}
          aria-label="Back to Attend+ home"
        >
          <span className="logo-icon">+</span>
          <h2>Attend<span>+</span></h2>
        </button>
        <div className="credits-nav-actions">
          <ThemeToggle />
          <button className="btn-secondary credits-back-btn" onClick={() => navigate('/')}>
            <IconArrowLeft size={17} /> Back to home
          </button>
        </div>
      </nav>

      <main className="credits-main">
        {/* Header */}
        <header className="credits-header">
          <span className="badge">Credits</span>
          <h1>
            Attend<span className="highlight">+</span>
          </h1>
          <p className="credits-built-by">
            Built by <strong>Group 8 of the SGP Major Project team.</strong>
          </p>
        </header>

        {/* Contributor roster */}
        <section className="credits-section" aria-labelledby="credits-roster-heading">
          <div className="credits-section-head">
            <h2 id="credits-roster-heading">Contributors</h2>
            <span className="credits-count">{CONTRIBUTORS.length} members</span>
          </div>

          <ol className="credits-roster ap-stagger">
            {CONTRIBUTORS.map((person) => {
              const RoleIcon = person.icon;
              return (
                <li className="credits-row" key={person.name}>
                  <span className="credits-numeral" aria-hidden="true">{person.numeral}</span>
                  <span className="credits-avatar" aria-hidden="true">{person.initials}</span>
                  <span className="credits-identity">
                    <strong className="credits-name">{person.name}</strong>
                    <span className="credits-role">
                      <RoleIcon size={14} /> {person.role}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <p className="credits-note">
          Attend+ is a paperless attendance system built as our major project. It uses secure rotating
          QR codes and a manual code fallback, so a class can be marked present in seconds.
        </p>

        <div className="credits-actions">
          <button className="btn-primary" onClick={() => navigate('/')}>
            <IconArrowLeft size={17} /> Back to home
          </button>
        </div>
      </main>

      <footer className="footer">
        <p>© 2026 Attend+ · Group 8, SGP Major Project</p>
      </footer>
    </div>
  );
};

export default Credits;
