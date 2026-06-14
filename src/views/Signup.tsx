import React, { useState } from 'react';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { User, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react';

interface SignupProps {
  onSuccess: (user: any, token: string) => void;
  onNavigateToLogin: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSuccess, onNavigateToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { showToast } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      showToast('All registration inputs are required.', 'error');
      return;
    }

    if (username.length < 3) {
      showToast('Username must be at least 3 characters.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/signup', { username, email, password });
      
      localStorage.setItem('vocalize_token', res.token);
      showToast(res.message || 'Registration successful! Welcome!', 'success');
      onSuccess(res.user, res.token);
    } catch (err: any) {
      showToast(err.message || 'Registration failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', width: '100%', margin: '60px auto 0 auto' }}>
      <GlassCard className="glass-panel" glow={true} style={{ padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 className="gradient-title" style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 800 }}>
            Join Vocalize
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Empower your learning using the power of voice
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                placeholder="e.g. JohnDoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                style={{ width: '100%', paddingLeft: '48px' }}
                required
              />
            </div>
          </div>

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
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ width: '100%', paddingLeft: '48px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '10px' }} disabled={loading}>
            {loading ? 'Registering...' : (
              <>
                <span>Create Account</span>
                <UserPlus size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
          <button 
            onClick={onNavigateToLogin}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              fontWeight: 500, 
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={14} />
            <span>Already have an account? Sign In</span>
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
export default Signup;
