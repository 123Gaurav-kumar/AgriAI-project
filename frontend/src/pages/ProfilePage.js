/**
 * Profile Page — User account management
 */

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './ProfilePage.css';

const INDIAN_STATES = [
  'Andhra Pradesh','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Odisha','Punjab','Rajasthan','Tamil Nadu',
  'Telangana','Uttar Pradesh','Uttarakhand','West Bengal'
];

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    state: user?.location?.state || '',
    farmName: user?.farmDetails?.farmName || '',
    farmSize: user?.farmDetails?.farmSize || ''
  });
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwErrors, setPwErrors] = useState({});
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => { document.title = 'Profile — AgriAI'; }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const { data } = await api.put('/user/profile', {
        name: profileData.name,
        phone: profileData.phone || null,
        location: { state: profileData.state || null },
        farmDetails: {
          farmName: profileData.farmName || null,
          farmSize: profileData.farmSize ? Number(profileData.farmSize) : null
        }
      });
      updateUser(data.data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwData.currentPassword) errs.currentPassword = 'Required';
    if (!pwData.newPassword || pwData.newPassword.length < 6) errs.newPassword = 'Min 6 characters';
    if (!/\d/.test(pwData.newPassword)) errs.newPassword = 'Must contain a number';
    if (pwData.newPassword !== pwData.confirmNew) errs.confirmNew = 'Passwords do not match';

    if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }

    setIsChangingPw(true);
    try {
      await api.put('/user/change-password', {
        currentPassword: pwData.currentPassword,
        newPassword: pwData.newPassword
      });
      toast.success('Password changed successfully!');
      setPwData({ currentPassword: '', newPassword: '', confirmNew: '' });
      setPwErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <div className="profile-page fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account and farm details</p>
      </div>

      <div className="profile-layout">
        {/* Sidebar: Avatar + Nav */}
        <div className="profile-sidebar-nav">
          {/* Avatar */}
          <div className="card profile-avatar-card">
            <div className="profile-avatar-lg">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="profile-name">{user?.name}</div>
            <div className="profile-email">{user?.email}</div>
            <div className={`badge badge-${user?.role === 'admin' ? 'diseased' : 'healthy'}`} style={{ marginTop: 4 }}>
              {user?.role}
            </div>
          </div>

          {/* Stats */}
          <div className="card profile-stats-card">
            <h4 className="card-title" style={{ marginBottom: 12 }}>Your Stats</h4>
            <div className="profile-stat">
              <span className="stat-label">Total Scans</span>
              <span className="stat-val">{user?.stats?.totalDetections || 0}</span>
            </div>
            <div className="profile-stat">
              <span className="stat-label">Diseases Found</span>
              <span className="stat-val" style={{ color: 'var(--red)' }}>{user?.stats?.diseasesFound || 0}</span>
            </div>
            <div className="profile-stat">
              <span className="stat-label">Healthy Crops</span>
              <span className="stat-val" style={{ color: 'var(--green-primary)' }}>{user?.stats?.healthyCrops || 0}</span>
            </div>
            <div className="profile-stat">
              <span className="stat-label">Member Since</span>
              <span className="stat-val">{new Date(user?.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Section Nav */}
          <div className="card profile-nav-card">
            {[
              { id: 'profile', icon: '👤', label: 'Personal Info' },
              { id: 'farm',    icon: '🌾', label: 'Farm Details' },
              { id: 'security',icon: '🔐', label: 'Security' },
            ].map(s => (
              <button
                key={s.id}
                className={`profile-nav-btn ${activeSection === s.id ? 'profile-nav-btn--active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="profile-main">

          {(activeSection === 'profile' || activeSection === 'farm') && (
            <form className="card" onSubmit={handleProfileUpdate}>
              <h2 className="section-title-lg" style={{ marginBottom: 20 }}>
                {activeSection === 'profile' ? '👤 Personal Information' : '🌾 Farm Details'}
              </h2>

              {activeSection === 'profile' && (
                <>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        className="form-input"
                        value={profileData.name}
                        onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                        required
                        minLength={2}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        className="form-input"
                        value={profileData.phone}
                        onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" value={user?.email} disabled style={{ opacity: 0.5 }} />
                    <span className="form-hint">Email cannot be changed</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <select
                      className="form-select"
                      value={profileData.state}
                      onChange={e => setProfileData(p => ({ ...p, state: e.target.value }))}
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </>
              )}

              {activeSection === 'farm' && (
                <>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Farm Name</label>
                      <input
                        className="form-input"
                        value={profileData.farmName}
                        onChange={e => setProfileData(p => ({ ...p, farmName: e.target.value }))}
                        placeholder="My Farm"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Farm Size (acres)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={profileData.farmSize}
                        onChange={e => setProfileData(p => ({ ...p, farmSize: e.target.value }))}
                        placeholder="e.g. 10"
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeSection === 'security' && (
            <form className="card" onSubmit={handlePasswordChange}>
              <h2 className="section-title-lg" style={{ marginBottom: 20 }}>🔐 Change Password</h2>

              {['currentPassword', 'newPassword', 'confirmNew'].map((field, i) => (
                <div className="form-group" key={field}>
                  <label className="form-label">
                    {field === 'currentPassword' ? 'Current Password' :
                     field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                  </label>
                  <input
                    type="password"
                    className={`form-input ${pwErrors[field] ? 'form-input--error' : ''}`}
                    value={pwData[field]}
                    onChange={e => setPwData(p => ({ ...p, [field]: e.target.value }))}
                    placeholder="••••••••"
                  />
                  {pwErrors[field] && <span className="form-error">{pwErrors[field]}</span>}
                </div>
              ))}

              <div style={{ marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={isChangingPw}>
                  {isChangingPw ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;