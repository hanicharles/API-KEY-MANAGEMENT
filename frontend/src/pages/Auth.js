import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';
import { loginUser, registerUser, googleLogin, forgotPassword } from '../utils/api';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await loginUser({ email: formData.email, password: formData.password });
        toast.success(`Welcome back, ${res.user.name}!`);
      } else {
        res = await registerUser(formData);
        toast.success('Registration successful!');
      }
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onAuthSuccess(res.user);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await googleLogin(credentialResponse.credential);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      toast.success(`Welcome, ${res.user.name}!`);
      onAuthSuccess(res.user);
    } catch (err) {
      toast.error('Google Sign-In failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--text)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)'
          }}>
            <Zap size={24} color="white" fill="white" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            API Key Management System
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Full Name</label>
              <input 
                className="form-input" required placeholder="John Doe"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Email Address</label>
            <input 
              className="form-input" type="email" required placeholder="you@example.com"
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Password</label>
            <input 
              className="form-input" type="password" required placeholder="••••••••"
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>

          {isLogin && (
            <div style={{ textAlign: 'right', marginTop: -8 }}>
              <button 
                type="button" 
                onClick={async () => {
                  if (!formData.email) return toast.error('Please enter your email first');
                  setLoading(true);
                  try {
                    const res = await forgotPassword({ email: formData.email });
                    toast.success(res.message);
                  } catch (err) {
                    toast.error('Failed to send reset email');
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', padding: 0 }}
                disabled={loading}
              >
                Forgot your password?
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          {/* Note: In production you MUST set REACT_APP_GOOGLE_CLIENT_ID */}
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google Sign-In was unsuccessful')}
            theme="filled_black"
            text={isLogin ? 'signin_with' : 'signup_with'}
            shape="rectangular"
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text2)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
