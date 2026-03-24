import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Shield } from 'lucide-react';
import { updateProfile, updatePassword } from '../utils/api';

export default function Profile({ user, onUpdateSession }) {
  const [profileForm, setProfileForm] = useState({ name: user.name, email: user.email });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfile(profileForm);
      onUpdateSession(res.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updatePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      toast.success('Password updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Profile Settings</h1>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 32 }}>Manage your account settings, name, email, and password.</p>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        {/* Edit Profile */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Personal Information</h2>
          </div>
          
          <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Full Name</label>
              <input 
                className="form-input" value={profileForm.name} 
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Email Address</label>
              <input 
                className="form-input" type="email" value={profileForm.email} 
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'max-content', marginTop: 8 }} disabled={loading}>
              Save Profile
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="#f59e0b" />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Update Password</h2>
          </div>
          
          <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {user.google_id && !user.password && (
              <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: 8, fontSize: 12, marginBottom: 8 }}>
                You log in using Google. Set a password below if you'd like to also be able to sign in with email and password.
              </div>
            )}
            
            {(!user.google_id || user.password) && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Current Password</label>
                <input 
                  className="form-input" type="password" placeholder="••••••••" value={passwordForm.currentPassword} 
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required 
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>New Password</label>
              <input 
                className="form-input" type="password" placeholder="••••••••" value={passwordForm.newPassword} 
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'max-content', marginTop: 8, background: '#f59e0b' }} disabled={loading}>
              <Lock size={14} /> {user.password ? 'Update Password' : 'Set Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
