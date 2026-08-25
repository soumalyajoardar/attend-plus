import React, { useState } from 'react';
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

    // 2. Check Student Email
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid student email address.');
      return;
    }

    // 3. Check Parent Email
    if (!parentEmail.includes('@') || !parentEmail.includes('.')) {
      setError('Please enter a valid parent email address.');
      return;
    }

    // 4. Check if Student and Parent email are the same
    if (email.toLowerCase() === parentEmail.toLowerCase()) {
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

      const data = await response.json();

      if (data.success) {
        // Accounts are created as "pending" — a teacher must approve before
        // the student can log in. Navigate to login with a success notice
        // instead of using a blocking alert().
        navigate('/login', {
          state: {
            notice:
              data.message ||
              'Registration submitted! Your account is waiting for teacher approval.',
          },
        });
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
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
      <button className="back-btn" onClick={() => navigate('/login')}>
        <IconArrowLeft size={16} /> Back to Login
      </button>
      <ThemeToggle className="auth-theme-toggle" />

      <div className="login-card signup-card">
        {/* Logo */}
        <div className="login-logo">
          <span className="logo-icon">+</span>
          <h2>Attend<span>+</span></h2>
        </div>

        <h1>Create Account</h1>
        <p className="login-subtitle">Register as a new student</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-box"><IconAlertCircle size={16} /> {error}</div>}
          <div className="input-group">
            <label>Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. Rohan Sharma" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label>Registration Number</label>
            <input 
            type="text" 
            placeholder="e.g. D232423001" 
            value={registrationNo}
            onChange={(e) => setRegistrationNo(e.target.value)}
            required 
            />
          </div>

          <div className="row-fields">
            <div className="input-group">
              <label>Department</label>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
>
                <option value="" disabled>-- Select Department --</option>
                <option value="CST">CST</option>
                <option value="ETCE">ETCE</option>
                <option value="EIE">EIE</option>
                <option value="CIVIL">CIVIL</option>
                <option value="EE">EE</option>
                <option value="ARCHITECTURAL ASSISTANTSHIP">ARCHITECTURAL ASSISTANTSHIP</option>
                <option value="PHARMACY">PHARMACY</option>
              </select>
            </div>

            <div className="input-group">
              <label>Semester</label>
              <select 
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
>
                <option value="" disabled>-- Select Semester --</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
                <option value="5th">5th</option>
                <option value="6th">6th</option>
</select>
            </div>
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="you@institute.edu" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label>Parent's Email Address</label>
            <input 
              type="email" 
              placeholder="parent@email.com" 
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label>Create Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="8"
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