import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './QRScanner.css';

const QRScanner = ({ onClose, onSuccess }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
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
          // Silent errors during scanning
        }
      );
    } catch (err) {
      setError('Cannot access camera. Please allow camera permission.');
      console.error('Scanner error:', err);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
      }).catch(() => {});
      scannerRef.current = null;
    }
  };

  const handleScan = async (decodedText) => {
    setIsProcessing(true);
    stopScanner();
    
    console.log('Scanned QR Data:', decodedText);

    try {
      const studentData = JSON.parse(localStorage.getItem('attendplus_user') || '{}');

      if (!studentData.registrationNo) {
        setError('Your session has expired. Please log in again.');
        setIsProcessing(false);
        hasScannedRef.current = false;
        return;
      }

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
      console.log('Backend response:', result);
      
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
        setTimeout(() => {
          startScanner();
        }, 2000);
      }
    } catch (err) {
      setError('Cannot connect to server. Please try again.');
      setIsProcessing(false);
      hasScannedRef.current = false;
      setTimeout(() => {
        startScanner();
      }, 2000);
    }
  };

  const handleClose = () => {
    stopScanner();
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
              <p>Closing scanner...</p>
            </div>
          ) : isProcessing ? (
            <div className="scan-success">
              <span className="success-icon">⏳</span>
              <h3>Processing...</h3>
              <p>Please wait...</p>
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