import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Credits from './pages/Credits';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { isAuthed } from './utils/auth';

// ProtectedRoute re-evaluates isAuthed() on every navigation rather than
// only on the initial bundle render. This prevents a race where clearing
// session storage (logout) doesn't re-check the guard until a hard reload.
function ProtectedRoute({ role, children }) {
  return isAuthed(role) ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/credits" element={<Credits />} />

        {/* Teacher Dashboard - checks either localStorage (remembered) or sessionStorage */}
        <Route
          path="/teacher-dashboard"
          element={
            <ProtectedRoute role="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* Student Dashboard - checks either localStorage (remembered) or sessionStorage */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
