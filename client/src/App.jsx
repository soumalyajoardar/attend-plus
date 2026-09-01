import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Credits from './pages/Credits';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { isAuthed, getRole } from './utils/auth';

function ProtectedRoute({ role, children }) {
  const loc = useLocation();
  if (!isAuthed()) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (role && !isAuthed(role)) {
    const actual = getRole();
    if (actual === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
    if (actual === 'student') return <Navigate to="/student-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  return children;
}
function PublicOnly({ children }) {
  if (isAuthed('teacher')) return <Navigate to="/teacher-dashboard" replace />;
  if (isAuthed('student')) return <Navigate to="/student-dashboard" replace />;
  if (isAuthed()) return <Navigate to="/" replace />;
  return children;
}
function NotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Page not found</h1>
      <p style={{ color: 'var(--ap-text-muted)' }}>The page you’re looking for doesn’t exist.</p>
      <a href="/" style={{ color: 'var(--ap-primary)', fontWeight: 700, textDecoration: 'none' }}>Go home</a>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/teacher-dashboard" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/student-dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
