import React, { useState, useRef, useEffect } from 'react';
import './QRScanner.css';
import { API_BASE } from '../utils/api';
import { getUser } from '../utils/auth';
import { IconClose, IconCheckCircle, IconClock, IconAlertCircle, IconIdCard } from '../components/Icons';

// Manual attendance entry — the fallback for when a student's camera won't scan
// the QR (bad lighting, cracked lens, permission denied). The teacher shows a
// 6-digit code that rotates every 30 seconds; the student types it here. It is
// verified server-side exactly like the QR (HMAC of the session secret), so it
// is just as proxy-resistant: the code is only valid for ~30s and only the
// teacher's screen ever shows it.
const ManualEntry = ({ onClose, onSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onClose]);

  const submit = async (e) => {
    if (e) e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setError('Please enter the full 6-digit code shown by your teacher.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Must go through getUser(), not localStorage directly — when the student
      // logs in without "Remember Me" the session lives in sessionStorage.
      const studentData = getUser();

      if (!studentData.registrationNo) {
        setError('Your session has expired. Please log in again.');
        setIsProcessing(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/attendance/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          registrationNo: studentData.registrationNo,
          code: clean,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setError('');
        timeoutRef.current = setTimeout(() => {
          onSuccess(result.message || 'Attendance marked successfully!');
        }, 500);
      } else {
        setError(result.message || 'That code was not accepted. Ask your teacher for the current code.');
        setIsProcessing(false);
      }
    } catch (_err) {
      setError('Cannot connect to server. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="scanner-overlay" onClick={onClose} role="presentation">
      <div className="scanner-modal" role="dialog" aria-modal="true" aria-labelledby="manual-title" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h2 id="manual-title">Enter Attendance Code</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><IconClose size={18} /></button>
        </div>

        <div className="scanner-body">
          {success ? (
            <div className="scan-success">
              <span className="success-icon"><IconCheckCircle size={40} /></span>
              <h3>Attendance Marked!</h3>
              <p>Closing...</p>
            </div>
          ) : isProcessing ? (
            <div className="scan-success">
              <span className="success-icon"><IconClock size={40} /></span>
              <h3>Checking code...</h3>
              <p>Please wait...</p>
            </div>
          ) : (
            <form onSubmit={submit} className="manual-entry-form">
              <span className="manual-entry-icon"><IconIdCard size={34} /></span>
              <p className="scanner-hint">Type the 6-digit code your teacher is showing on screen.</p>
              <input
                ref={inputRef}
                className="manual-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="0 0 0 0 0 0"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <p className="manual-entry-note">
                <IconClock size={12} /> The code changes every 30 seconds — enter the one shown right now.
              </p>

              {error && (
                <div className="error-box">
                  <IconAlertCircle size={16} /> {error}
                </div>
              )}

              <button type="submit" className="btn-primary btn-block" disabled={code.length !== 6}>
                Mark Attendance
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualEntry;
