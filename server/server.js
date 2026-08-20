// ---------- ATTENDANCE CHECK-IN ----------
app.post('/api/attendance/check-in', async (req, res) => {
  const { studentId, registrationNo, qrData } = req.body;

  try {
    console.log('📥 Check-in request received:');
    console.log('   Registration:', registrationNo);
    console.log('   QR Data:', qrData);

    // Parse QR data: "SESSION_ID.TOKEN"
    const parts = qrData.split('.');
    if (parts.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid QR code format.' });
    }

    const scannedSessionId = parts[0];
    const scannedToken = parts[1];

    // Check if there's an active session
    if (!global.activeSession) {
      return res.status(400).json({ success: false, message: 'No active attendance session.' });
    }

    // Check if session ID matches
    if (scannedSessionId !== global.activeSession.sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    // Simple time-based token verification (5-second window)
    const currentStep = Math.floor(Date.now() / 5000);
    const validTokens = [];
    for (let i = -2; i <= 2; i++) {
      const token = Math.floor(((currentStep + i) % 1000000 + 1000000) % 1000000).toString().padStart(6, '0');
      validTokens.push(token);
    }

    console.log('   Expected tokens:', validTokens);
    console.log('   Scanned token:', scannedToken);

    const isValid = validTokens.includes(scannedToken);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'QR code expired. Please scan again.' });
    }

    // Check if student already checked in
    if (global.activeSession.attendees.includes(registrationNo)) {
      return res.status(200).json({ success: true, message: 'Already marked present.' });
    }

    // Find student in database
    const student = await Student.findOne({ registrationNo: registrationNo });

    if (!student) {
      return res.status(400).json({ success: false, message: 'Student not found.' });
    }

    // Save attendance record
    const newAttendance = new Attendance({
      sessionId: scannedSessionId,
      studentId: student._id,
      registrationNo: registrationNo,
      studentName: student.fullName,
      department: global.activeSession.department,
      semester: global.activeSession.semester,
      subject: global.activeSession.subject,
      teacherId: global.activeSession.teacherId,
      method: 'qr',
    });

    await newAttendance.save();

    // Add to attendees
    global.activeSession.attendees.push(registrationNo);

    console.log('✅ Attendance saved for:', student.fullName);

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully!',
      studentName: student.fullName,
      totalAttendees: global.activeSession.attendees.length,
    });
  } catch (error) {
    console.error('Check-in error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});