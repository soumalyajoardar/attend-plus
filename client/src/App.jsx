import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { isAuthed } from './utils/auth';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Teacher Dashboard - checks either localStorage (remembered) or sessionStorage */}
        <Route
          path="/teacher-dashboard"
          element={isAuthed('teacher') ? <TeacherDashboard /> : <Navigate to="/login" />}
        />

        {/* Student Dashboard - checks either localStorage (remembered) or sessionStorage */}
        <Route
          path="/student-dashboard"
          element={isAuthed('student') ? <StudentDashboard /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
