/**
 * App.js — Root Application Component
 * ─────────────────────────────────────────────────────────────
 * Sets up:
 * - React Router with all page routes
 * - AuthProvider wrapping everything
 * - Toast notification system
 * - Protected route logic
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DetectPage from './pages/DetectPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';

// Layout
import Layout from './components/layout/Layout';

// Global styles
import './index.css';

// ─── Protected Route ──────────────────────────────────────────
// Redirects unauthenticated users to /login
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loader">
        <div className="loader-content">
          <div className="loader-spinner"></div>
          <p>Loading AgriAI...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ─── Guest Route ──────────────────────────────────────────────
// Redirects authenticated users away from login/register
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// ─── App Routes ───────────────────────────────────────────────
const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<Navigate to="/dashboard" replace />} />

    <Route path="/login" element={
      <GuestRoute><LoginPage /></GuestRoute>
    } />

    <Route path="/register" element={
      <GuestRoute><RegisterPage /></GuestRoute>
    } />

    {/* Protected routes — wrapped in Layout (sidebar + header) */}
    <Route path="/" element={
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    }>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="detect" element={<DetectPage />} />
      <Route path="result/:id" element={<ResultPage />} />
      <Route path="history" element={<HistoryPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route>

    {/* 404 fallback */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

// ─── Root App ─────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        {/* Toast notifications (global) */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a2e1a',
              color: '#e8f5e9',
              border: '1px solid #2d5a2d',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#4caf50', secondary: '#e8f5e9' }
            },
            error: {
              iconTheme: { primary: '#ef5350', secondary: '#fff' },
              style: {
                background: '#2d1a1a',
                color: '#ffcdd2',
                border: '1px solid #5d2d2d',
              }
            }
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;