import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { Users, Activity, Layers, Edit, Trash2, Plus, RefreshCw, Database, Shield } from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalGamesPlayed: number;
  overallAvgAccuracy: number;
  gameBreakdown: { quiz: number; pronunciation: number; memory: number };
  recentActivityCount: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  category: string;
  difficulty: string;
}

interface SystemLog {
  id: string;
  username: string;
  command: string;
  textRecognized: string;
  status: string;
  timestamp: string;
}

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'questions' | 'logs'>('stats');
  
  // Question Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('');
  const [formCategory, setFormCategory] = useState('Coding');
  const [formDifficulty, setFormDifficulty] = useState('beginner');

  const { showToast } = useNotification();

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const statsRes = await api.get('/admin/stats');
      const questionsRes = await api.get('/admin/questions');
      const reportsRes = await api.get('/admin/reports');
      
      setStats(statsRes);
      setQuestions(questionsRes);
      setLogs(reportsRes.voiceLogs || []);
    } catch (err: any) {
      showToast(err.message || 'Error pulling admin data. Verification check failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleOpenCreateForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormQuestion('');
    setFormOptions(['', '', '', '']);
    setFormCorrectAnswer('');
    setFormCategory('Coding');
    setFormDifficulty('beginner');
  };

  const handleOpenEditForm = (q: Question) => {
    setIsEditing(true);
    setEditingId(q.id);
    setFormQuestion(q.question);
    setFormOptions([...q.options]);
    setFormCorrectAnswer(q.correctAnswer);
    setFormCategory(q.category);
    setFormDifficulty(q.difficulty);
    
    // Smooth scroll to form
    const elem = document.getElementById('q-form-anchor');
    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...formOptions];
    updated[idx] = val;
    setFormOptions(updated);
  };

  // Submit CRUD (Create & Update)
  const handleSubmitQuestionForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formQuestion || formOptions.some(o => !o) || !formCorrectAnswer) {
      showToast('Please fill out question description and all options.', 'error');
      return;
    }

    if (!formOptions.includes(formCorrectAnswer)) {
      showToast('Correct answer must match one of the options exactly.', 'error');
      return;
    }

    const payload = {
      question: formQuestion,
      options: formOptions,
      correctAnswer: formCorrectAnswer,
      category: formCategory,
      difficulty: formDifficulty
    };

    try {
      if (isEditing && editingId) {
        // Edit Question
        await api.put(`/admin/questions/${editingId}`, payload);
        showToast('Question modified in database.', 'success');
      } else {
        // Create Question
        await api.post('/admin/questions', payload);
        showToast('New question saved to database pool.', 'success');
      }
      
      handleOpenCreateForm();
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Error processing CRUD request.', 'error');
    }
  };

  // Submit CRUD (Delete)
  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/admin/questions/${id}`);
      showToast('Question successfully purged.', 'success');
      loadAdminData();
    } catch (e) {
      showToast('Error purging question.', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '980px', width: '100%', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 className="gradient-title" style={{ fontSize: '32px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield style={{ color: 'var(--color-primary)' }} />
            <span>Admin Console</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage educational game pools, monitor logs, and analyze system parameters
          </p>
        </div>
        
        <button className="btn btn-glass" style={{ padding: '8px 16px' }} onClick={loadAdminData} disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 2s infinite linear' : 'none' }} />
          <span>Refresh Console</span>
        </button>
      </div>

      {loading ? (
        <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <RefreshCw className="float-animation" size={36} style={{ color: 'var(--color-primary)', animation: 'spin 2s infinite linear' }} />
          <h3 style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Retrieving Console Databases...</h3>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            {(['stats', 'questions', 'logs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  background: activeTab === tab ? 'var(--color-primary-glow)' : 'transparent',
                  color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : 'none'
                }}
              >
                {tab === 'stats' ? 'Overview Stats' : tab === 'questions' ? 'CRUD Question Manager' : 'Vocal Command Logs'}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW STATS */}
          {activeTab === 'stats' && stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Aggregated Counters */}
              <div className="stat-cards-grid">
                <GlassCard className="glass-panel" style={{ padding: '20px' }}>
                  <Users size={20} style={{ color: 'var(--color-secondary)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Users</p>
                  <h3 style={{ fontSize: '24px', marginTop: '4px' }}>{stats.totalUsers}</h3>
                </GlassCard>

                <GlassCard className="glass-panel" style={{ padding: '20px' }}>
                  <Activity size={20} style={{ color: 'var(--color-success)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Users</p>
                  <h3 style={{ fontSize: '24px', marginTop: '4px' }}>{stats.activeUsers}</h3>
                </GlassCard>

                <GlassCard className="glass-panel" style={{ padding: '20px' }}>
                  <Layers size={20} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Games Played</p>
                  <h3 style={{ fontSize: '24px', marginTop: '4px' }}>{stats.totalGamesPlayed}</h3>
                </GlassCard>

                <GlassCard className="glass-panel" style={{ padding: '20px' }}>
                  <Database size={20} style={{ color: 'var(--color-accent)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Avg Accuracy</p>
                  <h3 style={{ fontSize: '24px', marginTop: '4px', color: 'var(--color-success)' }}>{stats.overallAvgAccuracy}%</h3>
                </GlassCard>
              </div>

              {/* Game Play breakdown bar */}
              <GlassCard className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Games Distribution Breakdown</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Voice Quiz Challenge</p>
                    <h3 style={{ fontSize: '24px', marginTop: '4px', color: 'var(--color-primary)' }}>{stats.gameBreakdown.quiz}</h3>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Pronunciation Trainer</p>
                    <h3 style={{ fontSize: '24px', marginTop: '4px', color: 'var(--color-secondary)' }}>{stats.gameBreakdown.pronunciation}</h3>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Memory Voice Game</p>
                    <h3 style={{ fontSize: '24px', marginTop: '4px', color: 'var(--color-accent)' }}>{stats.gameBreakdown.memory}</h3>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 2: CRUD QUESTION MANAGER */}
          {activeTab === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Question Add/Edit Form Panel */}
              <div id="q-form-anchor">
                <GlassCard className="glass-panel" style={{ padding: '28px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Plus size={20} style={{ color: 'var(--color-secondary)' }} />
                    <span>{isEditing ? 'Modify Quiz Question' : 'Add New Quiz Question'}</span>
                  </h4>

                  <form onSubmit={handleSubmitQuestionForm}>
                    <div className="input-group">
                      <label className="input-label">Question Text</label>
                      <input 
                        type="text" 
                        value={formQuestion} 
                        onChange={(e) => setFormQuestion(e.target.value)} 
                        placeholder="e.g. Which HTML5 tag is used to embed video?" 
                        className="input-field" 
                        required 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      {formOptions.map((opt, i) => (
                        <div key={i} className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Option {String.fromCharCode(65 + i)}</label>
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => handleOptionChange(i, e.target.value)} 
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="input-field" 
                            required 
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div className="input-group">
                        <label className="input-label">Correct Answer</label>
                        <input 
                          type="text" 
                          value={formCorrectAnswer} 
                          onChange={(e) => setFormCorrectAnswer(e.target.value)} 
                          placeholder="Must match correct option text exactly!" 
                          className="input-field" 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Category</label>
                        <input 
                          type="text" 
                          value={formCategory} 
                          onChange={(e) => setFormCategory(e.target.value)} 
                          className="input-field" 
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Difficulty</label>
                        <select 
                          value={formDifficulty} 
                          onChange={(e) => setFormDifficulty(e.target.value)} 
                          className="input-field"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="submit" className="btn btn-primary">
                        <span>Save Question</span>
                      </button>
                      {(isEditing || formQuestion) && (
                        <button type="button" className="btn btn-glass" onClick={handleOpenCreateForm}>
                          <span>Reset Form</span>
                        </button>
                      )}
                    </div>
                  </form>
                </GlassCard>
              </div>

              {/* Pool List */}
              <GlassCard className="glass-panel" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                  Questions Pool ({questions.length} total)
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {questions.map((q) => (
                    <div 
                      key={q.id} 
                      style={{ 
                        padding: '18px', 
                        borderRadius: '12px', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '20px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            {q.difficulty}
                          </span>
                          <span style={{ fontSize: '10px', background: 'rgba(6,182,212,0.1)', color: 'var(--color-secondary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {q.category}
                          </span>
                        </div>
                        <h5 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{q.question}</h5>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {q.options.map((opt, i) => (
                            <span key={i} style={opt === q.correctAnswer ? { color: 'var(--color-success)', fontWeight: 'bold' } : {}}>
                              {String.fromCharCode(65 + i)}) {opt}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* CRUD Actions */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-glass" style={{ padding: '8px', borderRadius: '8px' }} onClick={() => handleOpenEditForm(q)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-glass" style={{ padding: '8px', borderRadius: '8px', color: 'var(--color-danger)' }} onClick={() => handleDeleteQuestion(q.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 3: SYSTEM ACTIVITY LOGS */}
          {activeTab === 'logs' && (
            <GlassCard className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                Vocal Interface Activity logs
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {logs.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-subtle)', padding: '24px' }}>No system logs captured yet.</p>
                ) : (
                  logs.map((log) => (
                    <div 
                      key={log.id} 
                      style={{ 
                        padding: '14px 18px', 
                        borderRadius: '10px', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-secondary)' }}>@{log.username}</span>
                        <span style={{ margin: '0 8px', color: 'var(--text-subtle)' }}>recognized:</span>
                        <span style={{ fontStyle: 'italic', fontWeight: 500 }}>"{log.textRecognized}"</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 'bold', 
                          textTransform: 'uppercase',
                          color: log.status === 'success' ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
};
export default AdminPanel;
