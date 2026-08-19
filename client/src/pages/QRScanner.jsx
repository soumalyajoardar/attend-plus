import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './QRScanner.css';

const QRScanner = ({ onClose, onSuccess }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);
  const [scanResult, setScanResult] = useState('');

  useEffect(() => {
    let scanner = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 5, qrbox: { width: 200, height: 200 } },
          (decodedText) => {
            // Only process once
            if (!hasScannedRef.current) {
              hasScannedRef.current = true;
              setScanResult(decodedText);
              
              // Immediately stop the scanner
              if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                  scannerRef.current.clear();
                  console.log('Scanner stopped after scan');
                }).catch((err) => {
                  console.log('Stop error:', err);
                });
              }
              
              // Process the scan
              processScan(decodedText);
            }
          },
          () => {
            // Normal scanning errors - ignore
          }
        );
      } catch (err) {
        setError('Cannot access camera. Please allow camera permission.');
        console.error('Scanner error:', err);
      }
    };

    startScanner();

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
        scanner.clear();
      }
    };
  }, []);

  const processScan = async (decodedText) => {
    setSuccess(true);
    
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
        setError('');
        onSuccess(result.message || 'Attendance marked successfully!');
      } else {
        setError(result.message || 'Failed to mark attendance.');
        setSuccess(false);
        // Allow retry after 2 seconds
        setTimeout(() => {
          hasScannedRef.current = false;
        }, 2000);
      }
    } catch (err) {
      setError('Cannot connect to server.');
      setSuccess(false);
      setTimeout(() => {
        hasScannedRef.current = false;
      }, 2000);
    }
  };

  const handleClose = () => {
    // Silently stop scanner
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
    }
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