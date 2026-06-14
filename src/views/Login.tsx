import React, { useState } from 'react';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

interface LoginProps {
  onSuccess: (user: any, token: string) => void;
  onNavigateToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onNavigateToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { showToast } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all credentials.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('vocalize_token', res.token);
      showToast(res.message || 'Welcome back to Vocalize!', 'success');
      onSuccess(res.user, res.token);
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', width: '100%', margin: '60px auto 0 auto' }}>
      <GlassCard className="glass-panel" glow={true} style={{ padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 className="gradient-title" style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 800 }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Access your voice learning dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-subtle)' }} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ width: '100%', paddingLeft: '48px' }}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '28px' }}>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-subtle)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ width: '100%', paddingLeft: '48px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '10px' }} disabled={loading}>
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign In</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-muted)' }}>New to the platform? </span>
          <button 
            onClick={onNavigateToSignup}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-secondary)', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>Create account</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
export default Login;
