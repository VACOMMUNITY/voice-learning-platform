import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { Trophy, RefreshCw, Award } from 'lucide-react';

interface LeaderboardRecord {
  userId: string;
  username: string;
  totalScore: number;
  gamesCount: number;
  maxAccuracy: number;
}

export const Leaderboard: React.FC = () => {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { showToast } = useNotification();

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await api.get('/games/leaderboard');
      setRecords(data);
    } catch (e) {
      showToast('Error retrieving global scores.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  // Separate podium ranks
  const first = records[0];
  const second = records[1];
  const third = records[2];
  const tail = records.slice(3);

  return (
    <div style={{ maxWidth: '780px', width: '100%', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 className="gradient-title" style={{ fontSize: '32px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy style={{ color: 'var(--color-secondary)' }} />
            <span>Leaderboard</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Global rankings of the top voice vocalizers
          </p>
        </div>
        
        <button className="btn btn-glass" style={{ padding: '8px 16px' }} onClick={loadLeaderboard} disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 2s infinite linear' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <RefreshCw className="float-animation" size={36} style={{ color: 'var(--color-primary)', animation: 'spin 2s infinite linear' }} />
          <h3 style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Compiling Rankings...</h3>
        </GlassCard>
      ) : records.length === 0 ? (
        <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Trophy size={48} style={{ color: 'var(--text-subtle)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-muted)' }}>Scoreboard is Empty</h3>
          <p style={{ color: 'var(--text-subtle)', fontSize: '14px', marginTop: '6px' }}>Be the first to record a game score!</p>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Elegant Podium */}
          <div className="podium-container">
            {/* 2nd Place */}
            {second && (
              <div className="podium-item silver">
                <div style={{ padding: '16px 8px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>2ND</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>{second.username}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 'bold', marginTop: '2px' }}>{second.totalScore}</p>
                  </div>
                  <Award size={20} style={{ color: '#cbd5e1' }} />
                </div>
              </div>
            )}

            {/* 1st Place */}
            {first && (
              <div className="podium-item gold">
                <div style={{ padding: '16px 8px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#eab308' }}>1ST</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>{first.username}</h4>
                    <p style={{ fontSize: '14px', color: 'var(--color-secondary)', fontWeight: 800, marginTop: '2px' }}>{first.totalScore}</p>
                  </div>
                  <Trophy size={24} style={{ color: '#eab308' }} className="float-animation" />
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {third && (
              <div className="podium-item bronze">
                <div style={{ padding: '16px 8px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309' }}>3RD</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>{third.username}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 'bold', marginTop: '2px' }}>{third.totalScore}</p>
                  </div>
                  <Award size={18} style={{ color: '#d97706' }} />
                </div>
              </div>
            )}
          </div>

          {/* Ranking List Table */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1.2fr 1.2fr 1fr', padding: '10px 16px', borderBottom: '1px solid var(--border-glass)', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                <span>Rank</span>
                <span>User</span>
                <span>Total Score</span>
                <span>Rounds</span>
                <span>Best Acc</span>
              </div>

              {/* Records */}
              {tail.map((rec, idx) => (
                <div 
                  key={rec.userId} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 2fr 1.2fr 1.2fr 1fr', 
                    padding: '16px', 
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid transparent',
                    alignItems: 'center',
                    transition: 'var(--transition-fast)'
                  }}
                  className="glass-card-row"
                >
                  <span style={{ 
                    fontFamily: 'var(--font-heading)', 
                    fontWeight: 'bold', 
                    color: 'var(--text-subtle)'
                  }}>
                    #{idx + 4}
                  </span>
                  <span style={{ fontWeight: 600 }}>{rec.username}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-secondary)' }}>{rec.totalScore} pts</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{rec.gamesCount || 1} played</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{rec.maxAccuracy || 100}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
export default Leaderboard;
