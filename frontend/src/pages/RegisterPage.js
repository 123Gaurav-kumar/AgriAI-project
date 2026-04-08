/**
 * Register Page
 * ─────────────────────────────────────────────────────────────
 * New account creation form with farm details.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal'
];

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 2-step form
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', state: '', farmName: '', farmSize: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!formData.name || formData.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Valid email required';
    if (!formData.password || formData.password.length < 6) errs.password = 'Min 6 characters';
    if (!/\d/.test(formData.password)) errs.password = 'Password must contain a number';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone || undefined,
      location: { state: formData.state || undefined },
      farmDetails: {
        farmName: formData.farmName || undefined,
        farmSize: formData.farmSize ? Number(formData.farmSize) : undefined
      }
    };

    const result = await register(payload);
    setIsLoading(false);

    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      {/* Branding Panel */}
      <div className="auth-panel auth-panel--brand">
        <div className="brand-content">
          <div className="brand-logo">🌿</div>
          <h1 className="brand-title">Join AgriAI</h1>
          <p className="brand-subtitle">
            Protect your harvest with AI-powered disease detection
          </p>
          <div className="brand-steps">
            <div className={`step-dot ${step >= 1 ? 'step-dot--active' : ''}`}>1</div>
            <div className="step-line"></div>
            <div className={`step-dot ${step >= 2 ? 'step-dot--active' : ''}`}>2</div>
          </div>
          <p className="step-label">
            {step === 1 ? 'Account Details' : 'Farm Information (Optional)'}
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-panel auth-panel--form">
        <div className="auth-form-wrapper fade-in" key={step}>

          {step === 1 && (
            <>
              <div className="auth-header">
                <h2 className="auth-title">Create account</h2>
                <p className="auth-subtitle">Step 1 of 2 — Your account details</p>
              </div>

              <form onSubmit={handleStep1} className="auth-form" noValidate>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                    placeholder="Ramesh Kumar"
                    value={formData.name}
                    onChange={handleChange}
                    autoFocus
                  />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                    placeholder="ramesh@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                    placeholder="Min 6 chars, include a number"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-full">
                  Continue →
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="auth-header">
                <h2 className="auth-title">Farm details</h2>
                <p className="auth-subtitle">Step 2 of 2 — Optional, helps personalize AI results</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State</label>
                  <select name="state" className="form-select" value={formData.state} onChange={handleChange}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Farm Name</label>
                    <input
                      type="text"
                      name="farmName"
                      className="form-input"
                      placeholder="My Farm"
                      value={formData.farmName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Size (acres)</label>
                    <input
                      type="number"
                      name="farmSize"
                      className="form-input"
                      placeholder="e.g. 5"
                      min="0"
                      value={formData.farmSize}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="btn-row">
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                    {isLoading ? <><span className="btn-spinner"></span> Creating...</> : 'Create Account 🌱'}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;