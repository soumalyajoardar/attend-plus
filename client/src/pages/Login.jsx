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
  const [userType, setUserType] = useState('student'); // Default is student
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Notice passed from the signup page after a successful registration
  const notice = location.state?.notice || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Use the entered ID (which can be ADMIN-2026 or student email)
    const identifier = id.trim();

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier,
          password,
          portal: userType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        saveSession({ token: data.token, role: data.role, user: data.user }, rememberMe);

        if (data.role === 'teacher') {
          navigate('/teacher-dashboard');
        } else {
          navigate('/student-dashboard');
        }
      } else {
        setError(data.message || 'Login failed.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      // Provide more helpful error messages
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please check your internet connection or try again later.');
      } else if (err.message?.includes('CORS')) {
        setError('Connection blocked by server. Please contact support.');
      } else {
        setError('Cannot connect to server. Please try again.');
      }
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
          <span className="logo-icon">+</span>
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
            <label>{userType === 'student' ? 'Registration Number' : 'Teacher ID'}</label>
            <input
              type="text"
              placeholder={userType === 'student' ? 'e.g. D232423001' : 'Teacher ID here'}
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </span>
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
