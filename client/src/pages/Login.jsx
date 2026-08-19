import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('student'); // Default is student
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // Use the entered ID (which can be ADMIN-2026 or student email)
  const identifier = id.trim();

  try {
    const response = await fetch('http://192.168.1.5:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: identifier,  // Backend will check if it's ADMIN-2026 or a student email
        password 
      }),
    });

    const data = await response.json();

    console.log('Backend response:', data);
    console.log('Role received:', data.role);
    if (data.success) {
      // Save token and role to localStorage (Remember Me)
      localStorage.setItem('attendplus_token', data.token);
      localStorage.setItem('attendplus_role', data.role);
      localStorage.setItem('attendplus_user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.role === 'teacher') {
  window.location.href = '/teacher-dashboard';
} else {
  window.location.href = '/student-dashboard';
}
    } else {
      setError(data.message || 'Login failed.');
    }
  } catch (err) {
    setError('Cannot connect to server.');
  }
};

  return (
    <div className="login-container">
      {/* Back button */}
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Back to Home
      </button>

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
            className={userType === 'student' ? 'active' : ''} 
            onClick={() => setUserType('student')}
          >
            Student
          </button>
          <button 
            className={userType === 'teacher' ? 'active' : ''} 
            onClick={() => setUserType('teacher')}
          >
            Teacher
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-box">{error}</div>}
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
      {showPassword ? 'Hide' : 'Show'}
    </span>
  </div>
</div>

          <button type="submit" className="btn-primary btn-block">
            Sign In →
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