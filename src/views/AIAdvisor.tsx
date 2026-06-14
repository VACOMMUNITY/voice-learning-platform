import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { Sparkles, Brain, Award, Shield, Compass, BookOpen, RefreshCw } from 'lucide-react';

interface AIAdvisorData {
  strengths: string;
  weaknesses: string;
  recommendations: string[];
  suggestedDifficulty: string;
  motivation: string;
  overallAvg: number;
}

export const AIAdvisor: React.FC = () => {
  const [data, setData] = useState<AIAdvisorData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { showToast } = useNotification();

  const loadAdvice = async () => {
    try {
      setLoading(true);
      const res = await api.get('/games/ai-advisor');
      setData(res);
    } catch (e) {
      showToast('Error compiling AI learning feedback.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvice();
  }, []);

  return (
    <div style={{ maxWidth: '780px', width: '100%', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 className="gradient-title" style={{ fontSize: '32px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles style={{ color: 'var(--color-accent)' }} />
            <span>AI Learning Advisor</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Cognitive feedback and vocal skills diagnostics powered by study patterns
          </p>
        </div>
        
        <button className="btn btn-glass" style={{ padding: '8px 16px' }} onClick={loadAdvice} disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 2s infinite linear' : 'none' }} />
          <span>Sync Diagnostics</span>
        </button>
      </div>

      {loading ? (
        <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <RefreshCw className="float-animation" size={36} style={{ color: 'var(--color-accent)', animation: 'spin 2s infinite linear' }} />
          <h3 style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Synthesizing Speech Metrics...</h3>
        </GlassCard>
      ) : !data ? (
        <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Compass size={48} style={{ color: 'var(--text-subtle)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-muted)' }}>No Analytics Available</h3>
          <p style={{ color: 'var(--text-subtle)', fontSize: '14px', marginTop: '6px' }}>Complete at least one game to unlock AI suggestions!</p>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Tutor Motivational Card */}
          <GlassCard className="glass-panel" glow={true} style={{ padding: '32px', borderLeft: '5px solid var(--color-accent)' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
              <div style={{ background: 'rgba(236,72,153,0.1)', color: 'var(--color-accent)', padding: '12px', borderRadius: '12px' }}>
                <Brain size={28} className="float-animation" />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI TUTOR REMARK
                </span>
                <h3 style={{ fontSize: '20px', marginTop: '6px', marginBottom: '8px', fontWeight: 600 }}>
                  "{data.motivation}"
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Based on vocal response latency and phonetic accuracy models.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Diagnostics split cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Strengths card */}
            <GlassCard className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--color-success)' }}>
                <Award size={20} />
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Identified Strengths</h4>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                {data.strengths}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Your learning patterns indicate strong cognitive matching in these core competencies. Keep leveraging this advantage!
              </p>
            </GlassCard>

            {/* Weaknesses card */}
            <GlassCard className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--color-accent)' }}>
                <Shield size={20} />
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Skill Gaps / Areas to Focus</h4>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                {data.weaknesses}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                System audio transcript logs flagged these areas for potential pronunciation or chronological recall deviations.
              </p>
            </GlassCard>
          </div>

          {/* Action Recommendations Lists */}
          <GlassCard className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} style={{ color: 'var(--color-secondary)' }} />
                <span>Custom Learning Path Recommendations</span>
              </h4>

              {data.overallAvg > 0 && (
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 'bold', 
                  background: 'rgba(16,185,129,0.1)', 
                  color: 'var(--color-success)',
                  padding: '4px 10px', 
                  borderRadius: '50px',
                  textTransform: 'uppercase'
                }}>
                  Overall Acc: {data.overallAvg}%
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'center', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border-glass)', 
                    padding: '16px', 
                    borderRadius: '12px' 
                  }}
                >
                  <span style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: 'var(--color-primary-glow)', 
                    color: 'var(--color-primary)', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '12px', 
                    fontWeight: 'bold' 
                  }}>
                    {index + 1}
                  </span>
                  <p style={{ fontSize: '14px', color: 'var(--text-main)', flex: 1 }}>{rec}</p>
                </div>
              ))}
            </div>

            {/* Level Suggestion footer */}
            <div style={{ marginTop: '28px', background: 'var(--bg-app)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: 'bold' }}>Recommended Challenge Level</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '2px' }}>Adaptive system suggests difficulty adjustment based on error ratios.</p>
              </div>
              <span style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                background: data.suggestedDifficulty === 'advanced' ? 'var(--color-accent)' : data.suggestedDifficulty === 'intermediate' ? 'var(--color-secondary)' : 'var(--color-primary)',
                color: 'white',
                fontFamily: 'var(--font-heading)',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {data.suggestedDifficulty}
              </span>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
export default AIAdvisor;
