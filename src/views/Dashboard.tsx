import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { Play, Sparkles, Brain, Trophy, Activity, MessageSquare, Shield, Clock, Wrench, Radio, Presentation, Users } from 'lucide-react';

interface ScoreLog {
  id: string;
  gameType: string;
  score: number;
  difficulty: string;
  accuracy: number;
  completedAt: string;
}

interface VoiceLog {
  id: string;
  command: string;
  textRecognized: string;
  status: string;
  timestamp: string;
}

interface DashboardProps {
  user: any;
  onLaunchGame: (game: 'quiz' | 'pronunciation' | 'memory' | 'vocational' | 'companion' | 'expo' | 'lobby') => void;
  onNavigateTab: (tab: 'dashboard' | 'leaderboard' | 'advisor' | 'admin') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLaunchGame, onNavigateTab }) => {
  const [scores, setScores] = useState<ScoreLog[]>([]);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const [overallAvg, setOverallAvg] = useState(0);
  const [aiTip, setAiTip] = useState('Launch your first game challenge to calibrate the AI Advisor!');
  const [loading, setLoading] = useState(true);

  const { showToast } = useNotification();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const history = await api.get('/games/history');
      setScores(history.scores || []);
      setVoiceLogs(history.voiceLogs || []);

      // Calculate overall average accuracy
      const scList = history.scores || [];
      if (scList.length > 0) {
        const totalAcc = scList.reduce((acc: number, curr: ScoreLog) => acc + (curr.accuracy || 100), 0);
        setOverallAvg(Math.round(totalAcc / scList.length));
      }

      // Fetch dynamic AI advice preview
      if (scList.length > 0) {
        const advice = await api.get('/games/ai-advisor');
        if (advice.recommendations && advice.recommendations.length > 0) {
          setAiTip(advice.recommendations[0]);
        }
      }
    } catch (e) {
      showToast('Error syncing dashboard metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Welcome back, <span className="neon-text-cyan">@{user.username}</span>!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '2px' }}>
            Empower your learning using the voice command gaming tools
          </p>
        </div>
        
        {user.role === 'admin' && (
          <button 
            className="btn btn-glass" 
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={() => onNavigateTab('admin')}
          >
            <Shield size={16} />
            <span>Admin Console</span>
          </button>
        )}
      </div>

      {loading ? (
        <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Activity size={32} className="float-animation" style={{ color: 'var(--color-secondary)', animation: 'spin 2s infinite linear' }} />
          <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Assembling your diagnostics...</p>
        </GlassCard>
      ) : (
        <div className="dashboard-grid">
          
          {/* LEFT SECTION: GAMES & PERFORMANCE GRAPHS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Start Game Triggers */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
                Educational Voice Games
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {/* Game 0: Mini Project Expo */}
                <GlassCard className="glass-panel" glow={true} style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px', borderLeft: '4px solid var(--color-accent)' }}>
                  <div>
                    <div style={{ background: 'rgba(236,72,153,0.1)', color: 'var(--color-accent)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <Presentation size={18} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Mini Project Expo</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Showcase technical prototypes, speak slide directions, and defend designs to AI Judges.
                    </p>
                  </div>
                  <button className="btn btn-accent" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '16px', gap: '6px' }} onClick={() => onLaunchGame('expo')}>
                    <span>Enter Expo</span>
                    <Play size={12} />
                  </button>
                </GlassCard>

                {/* Game 0.5: Multiplayer Arena */}
                <GlassCard className="glass-panel" glow={true} style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px', borderLeft: '4px solid var(--color-primary)' }}>
                  <div>
                    <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <Users size={18} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Multiplayer Arena</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Collaborate in slide pitches or duel in asymmetric e-sports coordinates challenges.
                    </p>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '16px', gap: '6px' }} onClick={() => onLaunchGame('lobby')}>
                    <span>Join Arena</span>
                    <Play size={12} />
                  </button>
                </GlassCard>

                {/* Game 1: Vocational Voice Simulators */}
                <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px' }}>
                  <div>
                    <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <Wrench size={18} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Vocational Simulators</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Voice-guided training for Welding safety, Carpentry checks, Electrical faults, and Healthcare CPR.
                    </p>
                  </div>
                  <button className="btn btn-glass" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '16px', gap: '6px' }} onClick={() => onLaunchGame('vocational')}>
                    <span>Launch Simulator</span>
                    <Play size={12} />
                  </button>
                </GlassCard>

                {/* Game 2: Tactical Companion */}
                <GlassCard className="glass-panel" glow={true} style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px' }}>
                  <div>
                    <div style={{ background: 'rgba(236,72,153,0.1)', color: 'var(--color-accent)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <Radio size={18} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Tactical Companion</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Train situational stress, battlefield coordinates, reaction latency, and communication clear calls.
                    </p>
                  </div>
                  <button className="btn btn-accent" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '16px', gap: '6px' }} onClick={() => onLaunchGame('companion')}>
                    <span>Active Comms</span>
                    <Play size={12} />
                  </button>
                </GlassCard>

                {/* Game 3: Quiz */}
                <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px' }}>
                  <div>
                    <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <Trophy size={18} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Quiz Challenge</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Answer academic multiple choice trivia questions directly with your voice.
                    </p>
                  </div>
                  <button className="btn btn-glass" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '16px', gap: '6px' }} onClick={() => onLaunchGame('quiz')}>
                    <span>Trivia Game</span>
                    <Play size={12} />
                  </button>
                </GlassCard>

                {/* Game 4: Pronunciation */}
                <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px' }}>
                  <div>
                    <div style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--color-secondary)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <MessageSquare size={18} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Pronunciation Trainer</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Calibrate vocal enunciation by speaking technical words and tongue twisters.
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '16px', gap: '6px' }} onClick={() => onLaunchGame('pronunciation')}>
                    <span>Start Training</span>
                    <Play size={12} />
                  </button>
                </GlassCard>

                {/* Game 5: Memory */}
                <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px' }}>
                  <div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <Brain size={18} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Memory Game</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Test chronological cognitive sequential storage limits by repeating word chains.
                    </p>
                  </div>
                  <button className="btn btn-glass" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '16px', gap: '6px' }} onClick={() => onLaunchGame('memory')}>
                    <span>Recall Game</span>
                    <Play size={12} />
                  </button>
                </GlassCard>
              </div>
            </div>

            {/* Performance Graph Section (CSS Sparkline SparkBars Chart) */}
            <GlassCard className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
                Vocal Performance Graph (Recent Rounds)
              </h3>
              
              {scores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-subtle)' }}>
                  <p>Complete training games to graph speech accuracies.</p>
                </div>
              ) : (
                <div>
                  {/* Inline CSS Bars Graph */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '140px', padding: '10px 0', background: 'rgba(0,0,0,0.12)', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '16px' }}>
                    {scores.slice(0, 7).reverse().map((sc, i) => {
                      const h = sc.accuracy || 100;
                      return (
                        <div key={sc.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '40px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-muted)' }}>{h}%</span>
                          <div 
                            style={{ 
                              width: '18px', 
                              height: `${h * 0.9}px`, 
                              background: sc.gameType === 'quiz' ? 'var(--color-primary)' : sc.gameType === 'pronunciation' ? 'var(--color-secondary)' : 'var(--color-accent)', 
                              borderRadius: '4px 4px 0 0',
                              boxShadow: '0 -2px 10px rgba(255,255,255,0.05)',
                              transition: 'height 0.3s ease'
                            }} 
                            title={`${sc.gameType.toUpperCase()}: ${h}%`}
                          />
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', marginTop: '6px', color: 'var(--text-subtle)', fontWeight: 'bold' }}>
                            {sc.gameType.substring(0, 4)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    💡 Graph plots speech accuracies. Tap secondary cards on the right to view complete diagnostics files.
                  </p>
                </div>
              )}
            </GlassCard>
          </div>

          {/* RIGHT SECTION: ANALYTICS PREVIEW & SPEECH ACTIVITY HISTORY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* AI Advisor Preview Panel */}
            <GlassCard className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-accent)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--color-accent)', marginBottom: '12px' }}>
                <Sparkles size={18} />
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>AI Tutor Recommendation</h4>
              </div>
              <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-main)', lineHeight: 1.4 }}>
                "{aiTip}"
              </p>
              
              {scores.length > 0 && (
                <button 
                  onClick={() => onNavigateTab('advisor')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-accent)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginTop: '12px',
                    padding: 0
                  }}
                >
                  View full learning breakdown →
                </button>
              )}
            </GlassCard>

            {/* Profile Statistics Summary */}
            <GlassCard className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Student Summary</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-subtle)' }}>User Score</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-secondary)' }}>{user.totalScore || 0} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-subtle)' }}>Sessions Logged</span>
                  <span style={{ fontWeight: 'bold' }}>{user.completedGames || 0} completed</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-subtle)' }}>Average Accuracy</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>{overallAvg || 100}%</span>
                </div>
              </div>
            </GlassCard>

            {/* Voice Activity Logs Preview list */}
            <GlassCard className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <Clock size={16} />
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Voice Command History</h4>
              </div>

              {voiceLogs.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontStyle: 'italic', textAlign: 'center' }}>No voice entries registered yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {voiceLogs.slice(0, 4).map((log) => (
                    <div 
                      key={log.id} 
                      style={{ 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--color-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{log.textRecognized}"
                      </span>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: log.status === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
