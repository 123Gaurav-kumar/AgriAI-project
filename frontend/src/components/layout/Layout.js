/**
 * Layout Component
 * ─────────────────────────────────────────────────────────────
 * Main app shell: sidebar navigation + top header + content area.
 * All protected pages render inside this via React Router's <Outlet />.
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

// Icons (using unicode emoji as simple icons)
const NAV_ITEMS = [
  { path: '/dashboard', icon: '⬡',  label: 'Dashboard' },
  { path: '/detect',    icon: '🔬', label: 'Detect Disease' },
  { path: '/history',   icon: '📋', label: 'History' },
  { path: '/profile',   icon: '👤', label: 'Profile' },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* ── Mobile Overlay ───────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">🌿</div>
          <div className="logo-text">
            <span className="logo-name">AgriAI</span>
            <span className="logo-tagline">Disease Detection</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <p className="nav-section-label">Navigation</p>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Quick Detect CTA */}
        <div className="sidebar-cta">
          <NavLink to="/detect" className="btn btn-primary w-full" onClick={() => setSidebarOpen(false)}>
            <span>+</span> New Detection
          </NavLink>
        </div>

        {/* User section at bottom */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <span>{user?.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="user-info">
            <p className="user-name">{user?.name}</p>
            <p className="user-role">{user?.role}</p>
          </div>
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            ↩
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="layout-main">
        {/* Top Header */}
        <header className="header">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <div className="header-title">
            {/* Dynamically set by pages using document.title */}
          </div>

          <div className="header-right">
            <div className="header-user">
              <div className="header-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <span>{user?.name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="header-name">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;