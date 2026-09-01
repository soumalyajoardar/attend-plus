import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';
import { API_BASE } from '../utils/api';
import { saveSession } from '../utils/auth';
import { IconArrowLeft, IconArrowRight, IconEye, IconEyeOff, IconAlertCircle, IconCheckCircle } from '../components/Icons';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState('student');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const notice = location.state?.notice || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    const identifier = id.trim();
    if (!identifier || !password) { setError('Please fill in all fields.'); setLoading(false); return; }
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password, portal: userType }),
      });
      let data;
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) data = await response.json();
      else {
        const text = await response.text();
        throw new Error(text || `Server error ${response.status}`);
      }
      if (response.ok && data.success) {
        saveSession({ token: data.token, role: data.role, user: data.user }, rememberMe);
        const from = location.state?.from || (data.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard');
        navigate(from, { replace: true });
      } else {
        setError(data?.message || 'Login failed.');
      }
    } catch (err) {
      console.error('Login error:', err);
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
      <button className="back-btn" onClick={() => navigate('/')}>
        <IconArrowLeft size={16} /> Back to Home
      </button>
      <ThemeToggle className="auth-theme-toggle" />

      <div className="login-card">
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

        <h1>Welcome Back</h1>
        <p className="login-subtitle">Sign in to access your dashboard</p>

        {/* Toggle Teacher / Student */}
        <div className="role-toggle">
          <button
            type="button"
            className={userType === 'student' ? 'active' : ''}
            onClick={() => setUserType('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={userType === 'teacher' ? 'active' : ''}
            onClick={() => setUserType('teacher')}
          >
            Teacher
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {notice && (
            <div className="error-box" style={{ background: 'var(--success-bg, #d4edda)', color: 'var(--success-color, #155724)', borderColor: 'var(--success-border, #c3e6cb)' }}>
              <IconCheckCircle size={16} /> {notice}
            </div>
          )}
          {error && <div className="error-box"><IconAlertCircle size={16} /> {error}</div>}
          <div className="input-group">
            <label htmlFor="login-id">{userType === 'student' ? 'Registration Number' : 'Teacher ID'}</label>
            <input
              id="login-id"
              type="text"
              placeholder={userType === 'student' ? 'e.g. D232423001' : 'Teacher ID here'}
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          <label className="remember-me-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : <>Sign In <IconArrowRight size={16} /></>}
          </button>
        </form>

        <p className="login-footer">
          New Student?
          <span className="link-text" onClick={() => navigate('/signup')}> Create an account</span>
          <br /><br />
          Trouble signing in? Contact Developer.
        </p>
      </div>
    </div>
  );
};

export default Login;
