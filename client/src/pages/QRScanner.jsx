import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './QRScanner.css';
import { API_BASE } from '../utils/api';
import { getUser } from '../utils/auth';
import { IconClose, IconCheckCircle, IconClock, IconAlertCircle } from '../components/Icons';

const QRScanner = ({ onClose, onSuccess }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
      }).catch(() => {});
      scannerRef.current = null;
    }
  }, []);

  const handleScan = useCallback(async (decodedText) => {
    setIsProcessing(true);
    stopScanner();

    try {
      // Must go through getUser(), not localStorage directly — when the student
      // logs in without "Remember Me" the session lives in sessionStorage.
      const studentData = getUser();

      if (!studentData.registrationNo) {
        setError('Your session has expired. Please log in again.');
        setIsProcessing(false);
        hasScannedRef.current = false;
        return;
      }

      const response = await fetch(`${API_BASE}/api/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          registrationNo: studentData.registrationNo,
          qrData: decodedText,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setError('');
        setTimeout(() => {
          onSuccess(result.message || 'Attendance marked successfully!');
        }, 500);
      } else {
        setError(result.message || 'Failed to mark attendance.');
        setIsProcessing(false);
        hasScannedRef.current = false;
      }
    } catch (_err) {
      setError('Cannot connect to server. Please try again.');
      setIsProcessing(false);
      hasScannedRef.current = false;
    }
  }, [stopScanner, onSuccess]);

  const startScanner = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 5, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          if (!hasScannedRef.current) {
            hasScannedRef.current = true;
            handleScan(decodedText);
          }
        },
        () => {
          // Scan frame errors are expected (no QR in frame yet) — intentionally silent
        }
      );
    } catch (err) {
      setError('Cannot access camera. Please allow camera permission.');
      console.error('Scanner error:', err);
    }
  }, [handleScan]);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="scanner-header">
          <h2>Scan QR Code</h2>
          <button className="close-btn" onClick={handleClose}><IconClose size={18} /></button>
        </div>

        <div className="scanner-body">
          {success ? (
            <div className="scan-success">
              <span className="success-icon"><IconCheckCircle size={40} /></span>
              <h3>Attendance Marked!</h3>
              <p>Closing scanner...</p>
            </div>
          ) : isProcessing ? (
            <div className="scan-success">
              <span className="success-icon"><IconClock size={40} /></span>
              <h3>Processing...</h3>
              <p>Please wait...</p>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="qr-reader-box"></div>
              <p className="scanner-hint">Point your camera at the teacher's QR code</p>
              
              {error && (
                <div className="error-box">
                  <IconAlertCircle size={16} /> {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;