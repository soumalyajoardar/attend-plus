import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './QRScanner.css';

const QRScanner = ({ onClose, onSuccess }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('qr-reader');
        
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Ignore scanning errors
          }
        );

        setScanner(html5QrCode);
      } catch (err) {
        setError('Cannot access camera. Please allow camera permission.');
        console.error('Scanner error:', err);
      }
    };

    startScanner();

    // Cleanup on unmount
    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, []);

  const handleScanSuccess = async (decodedText) => {
    setSuccess(true);
    console.log('Scanned:', decodedText);

    try {
      const studentData = JSON.parse(localStorage.getItem('attendplus_user') || '{}');
      
      const response = await fetch('https://attend-plus-server.onrender.com/api/attendance/check-in', {
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
        onSuccess(result.message || 'Attendance marked successfully!');
      } else {
        setError(result.message || 'Failed.');
        setSuccess(false);
      }
    } catch (err) {
      setError('Cannot connect to server.');
      setSuccess(false);
    }
  };

  const handleClose = () => {
    // Simply call onClose - the parent will unmount this component
    // and the cleanup will handle the camera
    onClose();
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="scanner-header">
          <h2>Scan QR Code</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="scanner-body">
          {success ? (
            <div className="scan-success">
              <span className="success-icon">✅</span>
              <h3>Attendance Marked!</h3>
              <p>You are marked present for this class.</p>
              <button className="btn-primary" onClick={handleClose}>Done</button>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="qr-reader-box"></div>
              <p className="scanner-hint">Point your camera at the teacher's QR code</p>
              
              {error && (
                <div className="error-box">
                  {error}
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