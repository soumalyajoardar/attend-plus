import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Teacher Dashboard - Check localStorage at render time */}
        <Route 
          path="/teacher-dashboard" 
          element={
            localStorage.getItem('attendplus_role') === 'teacher' 
              ? <TeacherDashboard /> 
              : <Navigate to="/login" />
          } 
        />
        
        {/* Student Dashboard - Check localStorage at render time */}
        <Route 
          path="/student-dashboard" 
          element={
            localStorage.getItem('attendplus_role') === 'student' 
              ? <StudentDashboard /> 
              : <Navigate to="/login" />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;