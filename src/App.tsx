import { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { useNotification, NotificationProvider } from './components/Notification';
import { Login } from './views/Login';
import { Signup } from './views/Signup';
import { Dashboard } from './views/Dashboard';
import { VoiceQuiz } from './views/VoiceQuiz';
import { PronunciationTrainer } from './views/PronunciationTrainer';
import { MemoryGame } from './views/MemoryGame';
import { VocationalSimulation } from './views/VocationalSimulation';
import { CompanionMode } from './views/CompanionMode';
import { ProjectExpo } from './views/ProjectExpo';
import { MultiplayerLobby } from './views/MultiplayerLobby';
import { CoOpProjectExpo } from './views/CoOpProjectExpo';
import { TacticalClash1v1 } from './views/TacticalClash1v1';
import { Leaderboard } from './views/Leaderboard';
import { AIAdvisor } from './views/AIAdvisor';
import { AdminPanel } from './views/AdminPanel';
import { Trophy, Shield, Brain, Sun, Moon, LogOut, Music2, VolumeX, Sparkles, LayoutDashboard } from 'lucide-react';
import './App.css';

type TabView = 'dashboard' | 'leaderboard' | 'advisor' | 'admin' | 'quiz' | 'pronunciation' | 'memory' | 'vocational' | 'companion' | 'expo' | 'lobby' | 'coop' | 'tactical_duel';

function AppContent() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabView>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  
  // Multiplayer Room state variables
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);

  const { showToast } = useNotification();
  const synthDroneRef = useRef<any | null>(null);
  const activityTimeoutRef = useRef<number | null>(null);

  // 1. Session check on mount
  const checkSession = async () => {
    if (!localStorage.getItem('vocalize_token')) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
    } catch (err) {
      localStorage.removeItem('vocalize_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
    
    // Auto logout listener for intercepting 401s
    const handleLogoutEvent = () => {
      setUser(null);
      showToast('Session expired. Logging out.', 'info');
    };
    window.addEventListener('vocalize_logout', handleLogoutEvent);
    
    // Default theme setup
    const savedTheme = localStorage.getItem('vocalize_theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Setup session inactivity check
    resetInactivityTimeout();
    const events = ['mousemove', 'keypress', 'click', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetInactivityTimeout));

    return () => {
      window.removeEventListener('vocalize_logout', handleLogoutEvent);
      events.forEach(ev => window.removeEventListener(ev, resetInactivityTimeout));
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      stopSynthBackgroundMusic();
    };
  }, []);

  // 2. Session Inactivity Tracker (10 minutes)
  const resetInactivityTimeout = () => {
    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    
    // Automatically logout after 10 minutes of zero activity
    activityTimeoutRef.current = window.setTimeout(() => {
      if (localStorage.getItem('vocalize_token')) {
        handleLogout();
        showToast('Logged out due to 10 minutes of complete inactivity.', 'info');
      }
    }, 10 * 60 * 1000);
  };

  // 3. Auth callbacks
  const handleAuthSuccess = (userData: any, token: string) => {
    console.log('Authentication success. Session token saved securely.', token.substring(0, 8) + '...');
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('vocalize_token');
    setUser(null);
    setCurrentTab('dashboard');
    stopSynthBackgroundMusic();
    showToast('Logged out successfully.', 'success');
  };

  // 4. Light/Dark theme toggler
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('vocalize_theme', nextTheme);
    showToast(`Switched to ${nextTheme} theme.`, 'success');
  };

  // 5. Programmatic Web Audio Synthesizer Background Music Drone
  const toggleSynthBackgroundMusic = () => {
    if (isMusicPlaying) {
      stopSynthBackgroundMusic();
    } else {
      startSynthBackgroundMusic();
    }
  };

  const startSynthBackgroundMusic = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const droneGain = audioCtx.createGain();
      droneGain.gain.setValueAtTime(0.04, audioCtx.currentTime); // very low volume drone
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, audioCtx.currentTime);
      
      droneGain.connect(filter);
      filter.connect(audioCtx.destination);

      // Osc 1 (Drone bass fundamental)
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, audioCtx.currentTime); // A2 fundamental
      osc1.connect(droneGain);
      osc1.start();

      // Osc 2 (Ambient Fifth chord note)
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(164.81, audioCtx.currentTime); // E3 perfect fifth
      osc2.connect(droneGain);
      osc2.start();

      synthDroneRef.current = {
        ctx: audioCtx,
        oscs: [osc1, osc2],
        gain: droneGain
      };
      
      setIsMusicPlaying(true);
      showToast('Programmatic background drone synth active.', 'success');
    } catch (e) {
      console.warn('Synth background music error:', e);
    }
  };

  const stopSynthBackgroundMusic = () => {
    if (synthDroneRef.current) {
      try {
        synthDroneRef.current.oscs.forEach((osc: any) => osc.stop());
        synthDroneRef.current.ctx.close();
      } catch (e) {}
      synthDroneRef.current = null;
    }
    setIsMusicPlaying(false);
  };

  // 6. Navigation router
  const renderView = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', marginTop: '120px' }}>
          <div className="pulse-mic listening" style={{ margin: '0 auto', animation: 'float 3s infinite ease-in-out' }}>
            <Sparkles size={36} style={{ color: 'white', animation: 'spin 4s infinite linear' }} />
          </div>
          <h2 style={{ marginTop: '24px', fontFamily: 'var(--font-heading)' }} className="gradient-title">
            Vocalize Ecosystem booting...
          </h2>
        </div>
      );
    }

    if (!user) {
      return authView === 'login' ? (
        <Login onSuccess={handleAuthSuccess} onNavigateToSignup={() => setAuthView('signup')} />
      ) : (
        <Signup onSuccess={handleAuthSuccess} onNavigateToLogin={() => setAuthView('login')} />
      );
    }

    // Switch case view navigation router
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            onLaunchGame={(game) => setCurrentTab(game)} 
            onNavigateTab={(tab) => setCurrentTab(tab)} 
          />
        );
      case 'leaderboard':
        return <Leaderboard />;
      case 'advisor':
        return <AIAdvisor />;
      case 'admin':
        return <AdminPanel />;
      case 'quiz':
        return <VoiceQuiz user={user} onBack={() => { setCurrentTab('dashboard'); checkSession(); }} />;
      case 'pronunciation':
        return <PronunciationTrainer user={user} onBack={() => { setCurrentTab('dashboard'); checkSession(); }} />;
      case 'memory':
        return <MemoryGame user={user} onBack={() => { setCurrentTab('dashboard'); checkSession(); }} />;
      case 'vocational':
        return <VocationalSimulation user={user} onBack={() => { setCurrentTab('dashboard'); checkSession(); }} />;
      case 'companion':
        return <CompanionMode user={user} onBack={() => { setCurrentTab('dashboard'); checkSession(); }} />;
      case 'expo':
        return <ProjectExpo user={user} onBack={() => { setCurrentTab('dashboard'); checkSession(); }} />;
      case 'lobby':
        return (
          <MultiplayerLobby 
            user={user} 
            onBack={() => setCurrentTab('dashboard')} 
            onLaunchCoOp={(code, isHostVal) => {
              setRoomCode(code);
              setIsHost(isHostVal);
              setCurrentTab('coop');
            }} 
            onLaunch1v1={(code, isHostVal) => {
              setRoomCode(code);
              setIsHost(isHostVal);
              setCurrentTab('tactical_duel');
            }} 
          />
        );
      case 'coop':
        return <CoOpProjectExpo user={user} roomCode={roomCode} isHost={isHost} onBack={() => setCurrentTab('lobby')} />;
      case 'tactical_duel':
        return <TacticalClash1v1 user={user} roomCode={roomCode} isHost={isHost} onBack={() => setCurrentTab('lobby')} />;
      default:
        return <Dashboard user={user} onLaunchGame={(game) => setCurrentTab(game)} onNavigateTab={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="app-container">
      
      {/* Dynamic Glass Nav Header */}
      <header className="header-glass">
        <a href="#" className="logo-group" onClick={(e) => { e.preventDefault(); if (user) setCurrentTab('dashboard'); }}>
          <Brain style={{ color: 'var(--color-secondary)' }} />
          <span style={{ fontSize: '20px', fontWeight: 800 }}>Vocalize</span>
        </a>

        {user && !['quiz', 'pronunciation', 'memory', 'vocational', 'companion', 'expo', 'lobby', 'coop', 'tactical_duel'].includes(currentTab) && (
          <nav style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`btn btn-glass ${currentTab === 'dashboard' ? 'btn-primary' : ''}`}
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setCurrentTab('dashboard')}
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>
            <button 
              className={`btn btn-glass ${currentTab === 'leaderboard' ? 'btn-primary' : ''}`}
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setCurrentTab('leaderboard')}
            >
              <Trophy size={14} />
              <span>Leaderboard</span>
            </button>
            <button 
              className={`btn btn-glass ${currentTab === 'advisor' ? 'btn-primary' : ''}`}
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setCurrentTab('advisor')}
            >
              <Sparkles size={14} />
              <span>AI Advisor</span>
            </button>
            {user.role === 'admin' && (
              <button 
                className={`btn btn-glass ${currentTab === 'admin' ? 'btn-primary' : ''}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setCurrentTab('admin')}
              >
                <Shield size={14} />
                <span>Admin</span>
              </button>
            )}
          </nav>
        )}

        {/* Global toggles and profiles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Programmatic Music toggle */}
          {user && (
            <button 
              className="btn btn-glass" 
              style={{ padding: '8px', borderRadius: '50%' }}
              onClick={toggleSynthBackgroundMusic}
              title="Toggle programmatic background chimes drone"
            >
              {isMusicPlaying ? <Music2 size={16} style={{ color: 'var(--color-secondary)', animation: 'spin 5s infinite linear' }} /> : <VolumeX size={16} />}
            </button>
          )}

          {/* Theme toggle */}
          <button 
            className="btn btn-glass" 
            style={{ padding: '8px', borderRadius: '50%' }}
            onClick={toggleTheme}
            title="Toggle light/dark theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Logout button */}
          {user && (
            <button 
              className="btn btn-glass" 
              style={{ padding: '8px', borderRadius: '50%', color: 'var(--color-danger)' }}
              onClick={handleLogout}
              title="Logout session"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main viewport */}
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
