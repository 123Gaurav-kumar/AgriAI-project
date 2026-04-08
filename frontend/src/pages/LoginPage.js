/**
 * Login Page
 * ─────────────────────────────────────────────────────────────
 * Email/password login form.
 * Uses AuthContext.login() which calls POST /api/auth/login.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Enter a valid email';
    if (!formData.password) errs.password = 'Password is required';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsLoading(true);
    const result = await login(formData.email, formData.password);
    setIsLoading(false);

    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      {/* Left Panel — Branding */}
      <div className="auth-panel auth-panel--brand">
        <div className="brand-content">
          <div className="brand-logo">🌿</div>
          <h1 className="brand-title">AgriAI</h1>
          <p className="brand-subtitle">
            AI-powered crop disease detection for modern Indian agriculture
          </p>
          <div className="brand-features">
            <div className="brand-feature">
              <span className="feature-icon">🔬</span>
              <span>Instant AI diagnosis from photo</span>
            </div>
            <div className="brand-feature">
              <span className="feature-icon">💊</span>
              <span>Treatment recommendations</span>
            </div>
            <div className="brand-feature">
              <span className="feature-icon">📊</span>
              <span>Track field health over time</span>
            </div>
            <div className="brand-feature">
              <span className="feature-icon">🌾</span>
              <span>26+ Indian crops supported</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="auth-panel auth-panel--form">
        <div className="auth-form-wrapper fade-in">
          <div className="auth-header">
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">Sign in to your AgriAI account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                placeholder="farmer@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="btn-spinner"></span> Signing in...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="demo-hint">
            <p>🧪 Demo: use any email & password to register first</p>
          </div>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">Create one free →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;