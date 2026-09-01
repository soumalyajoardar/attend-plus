import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // We will reuse the same styles as the login page!
import { API_BASE } from '../utils/api';
import { IconArrowLeft, IconArrowRight, IconEye, IconEyeOff, IconAlertCircle } from '../components/Icons';
import ThemeToggle from '../components/ThemeToggle';

const Signup = () => {
  const navigate = useNavigate();

  // State for all the fields you requested
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [email, setEmail] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (department !== 'CST') {
      setSemester('');
    }
  }, [department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // prevent double-submit
    setError(''); // Clear previous errors

    // 1. Check if name is long enough
    if (fullName.trim().length < 3) {
      setError('Please enter your full name (at least 3 characters).');
      return;
    }

    // Check Registration Number
    if (registrationNo.trim().length < 3) {
      setError('Please enter your registration number.');
      return;
    }

    // Check Department & Semester
    if (!department || !semester) {
      setError('Please select your department and semester.');
      return;
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      setError('Please enter a valid student email address.');
      return;
    }
    if (!emailRe.test(parentEmail.trim())) {
      setError('Please enter a valid parent email address.');
      return;
    }
    if (email.trim().toLowerCase() === parentEmail.trim().toLowerCase()) {
      setError('Student email and Parent email cannot be the same.');
      return;
    }

    // 5. Check Password Strength (minimum 8 characters, matching server rule)
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // If all validations pass, send to server
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          registrationNo,
          department,
          semester,
          email,
          parentEmail,
          password,
        }),
      });

      const ct = response.headers.get('content-type') || '';
      let data;
      if (ct.includes('application/json')) data = await response.json();
      else {
        const t = await response.text();
        throw new Error(t || `Server error ${response.status}`);
      }
      if (response.ok && data.success) {
        navigate('/login', { state: { notice: data.message || 'Registration submitted! Your account is waiting for teacher approval.' } });
      } else {
        setError(data?.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to server. Check your connection and try again.');
      } else {
        setError(err.message || 'Cannot connect to server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Back button */}
      <button className="back-btn" onClick={() => navigate('/login')}>
        <IconArrowLeft size={16} /> Back to Login
      </button>
      <ThemeToggle className="auth-theme-toggle" />

      <div className="login-card signup-card">
        {/* Logo */}
        <div className="login-logo">
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

        <h1>Create Account</h1>
        <p className="login-subtitle">Register as a new student</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-box"><IconAlertCircle size={16} /> {error}</div>}
          <div className="input-group">
            <label htmlFor="su-name">Full Name</label>
            <input id="su-name" type="text" placeholder="e.g. Rohan Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
          </div>

          <div className="input-group">
            <label htmlFor="su-reg">Registration Number</label>
            <input id="su-reg" type="text" placeholder="e.g. D232423001" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} required autoComplete="off" spellCheck={false} style={{ textTransform: 'uppercase' }} />
          </div>

          <div className="row-fields">
            <div className="input-group">
              <label htmlFor="su-dept">Department</label>
              <select id="su-dept" value={department} onChange={(e) => setDepartment(e.target.value)} required>
                <option value="" disabled>-- Select Department --</option>
                <option value="CST">CST</option>
                <option value="ETCE" disabled>ETCE (Coming soon)</option>
                <option value="EIE" disabled>EIE (Coming soon)</option>
                <option value="CIVIL" disabled>CIVIL (Coming soon)</option>
                <option value="EE" disabled>EE (Coming soon)</option>
                <option value="ARCHITECTURAL ASSISTANTSHIP" disabled>ARCHITECTURAL ASSISTANTSHIP (Coming soon)</option>
                <option value="PHARMACY" disabled>PHARMACY (Coming soon)</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="su-sem">Semester</label>
              <select id="su-sem" value={semester} onChange={(e) => setSemester(e.target.value)} required={department==='CST'} disabled={department !== 'CST'}>
                <option value="" disabled>-- Select Semester --</option>
                {department === 'CST' && (<><option value="5th">5th</option><option value="6th">6th</option></>)}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="su-email">Email Address</label>
            <input id="su-email" type="email" placeholder="you@institute.edu" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div className="input-group">
            <label htmlFor="su-parent">Parent's Email Address</label>
            <input id="su-parent" type="email" placeholder="parent@email.com" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div className="input-group">
            <label htmlFor="su-pass">Create Password</label>
            <div className="password-wrapper">
              <input id="su-pass" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              <button type="button" className="eye-icon" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Submitting…' : <> Create Account <IconArrowRight size={16} /></>}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? 
          <span className="link-text" onClick={() => navigate('/login')}> Sign In</span>
        </p>
      </div>
    </div>
  );
};

export default Signup;