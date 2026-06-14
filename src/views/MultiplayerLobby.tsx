import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { 
  Users, Key, Play, ChevronLeft, Plus, AlertCircle, Bot, Zap, Star
} from 'lucide-react';

interface LobbyState {
  roomCode: string;
  gameType: 'expo' | 'tactical';
  player1: { id: string; username: string };
  player2: { id: string; username: string } | null;
  status: 'waiting' | 'active' | 'complete';
}

interface MultiplayerLobbyProps {
  user: any;
  onBack: () => void;
  onLaunchCoOp: (roomCode: string, isHost: boolean) => void;
  onLaunch1v1: (roomCode: string, isHost: boolean) => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ 
  user, onBack, onLaunchCoOp, onLaunch1v1 
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeLobby, setActiveLobby] = useState<LobbyState | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<'expo' | 'tactical'>('expo');
  const [loading, setLoading] = useState(false);
  const [lobbyPollInterval, setLobbyPollInterval] = useState<number | null>(null);

  const { showToast } = useNotification();

  // Polling to detect when Player 2 joins or Host starts the game
  const pollLobbyState = async (code: string) => {
    try {
      const res = await api.get(`/multiplayer/room/${code}`);
      setActiveLobby(res);
      
      // If room is activated (game started by host), trigger parent launchers
      if (res.status === 'active') {
        clearInterval(lobbyPollInterval!);
        setLobbyPollInterval(null);
        
        const isHost = res.player1.id === user.id;
        if (res.gameType === 'expo') {
          onLaunchCoOp(res.roomCode, isHost);
        } else {
          onLaunch1v1(res.roomCode, isHost);
        }
      }
    } catch (e) {
      console.warn('Polling lobby error:', e);
    }
  };

  const createRoom = async () => {
    try {
      setLoading(true);
      const lobby = await api.post('/multiplayer/create', { gameType: selectedGameType });
      setActiveLobby(lobby);
      showToast(`Lobby ${lobby.roomCode} created successfully!`, 'success');
      
      // Start polling
      const interval = window.setInterval(() => {
        pollLobbyState(lobby.roomCode);
      }, 2000);
      setLobbyPollInterval(interval);
    } catch (e) {
      showToast('Error creating lobby.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCodeInput) return;
    try {
      setLoading(true);
      const lobby = await api.post('/multiplayer/join', { roomCode: roomCodeInput });
      setActiveLobby(lobby);
      showToast(`Joined Room ${lobby.roomCode}!`, 'success');
      
      // Start polling
      const interval = window.setInterval(() => {
        pollLobbyState(lobby.roomCode);
      }, 2000);
      setLobbyPollInterval(interval);
    } catch (e) {
      showToast('Error joining lobby. Verify code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addBotPlayer = async () => {
    if (!activeLobby) return;
    try {
      // Simulate guest joining by syncing bot details
      const updated = await api.post('/multiplayer/sync', {
        roomCode: activeLobby.roomCode,
        player2: {
          id: 'bot_player_vocal',
          username: 'Rival_Vocalizer_BOT'
        }
      });
      setActiveLobby(updated);
      showToast('Bot player joined the lobby.', 'success');
    } catch (e) {
      showToast('Error adding bot.', 'error');
    }
  };

  const startMultiplayerGame = async () => {
    if (!activeLobby) return;
    try {
      // Set status to active to trigger launching on all clients
      await api.post('/multiplayer/sync', {
        roomCode: activeLobby.roomCode,
        status: 'active'
      });
      
      const isHost = activeLobby.player1.id === user.id;
      if (activeLobby.gameType === 'expo') {
        onLaunchCoOp(activeLobby.roomCode, isHost);
      } else {
        onLaunch1v1(activeLobby.roomCode, isHost);
      }
    } catch (e) {
      showToast('Error starting match.', 'error');
    }
  };

  const leaveLobby = async () => {
    if (!activeLobby) return;
    try {
      await api.post('/multiplayer/leave', { roomCode: activeLobby.roomCode });
      if (lobbyPollInterval) {
        clearInterval(lobbyPollInterval);
        setLobbyPollInterval(null);
      }
      setActiveLobby(null);
      showToast('Lobby closed.', 'info');
    } catch (e) {
      showToast('Error closing lobby.', 'error');
    }
  };

  useEffect(() => {
    return () => {
      if (lobbyPollInterval) clearInterval(lobbyPollInterval);
    };
  }, [lobbyPollInterval]);

  return (
    <div style={{ maxWidth: '650px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 className="gradient-title" style={{ fontSize: '32px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users style={{ color: 'var(--color-primary)' }} />
            <span>Multiplayer Vocal Arena</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Coordinate and compete in voice-driven team challenges with friends
          </p>
        </div>
        <button onClick={onBack} className="btn btn-glass" style={{ padding: '8px 16px' }}>
          <ChevronLeft size={16} />
          <span>Dashboard</span>
        </button>
      </div>

      {!activeLobby ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Create Room Block */}
          <GlassCard className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
              Create Match Lobby
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className={`btn btn-glass ${selectedGameType === 'expo' ? 'btn-primary' : ''}`}
                  style={{ flex: 1, padding: '14px', flexDirection: 'column', gap: '6px' }}
                  onClick={() => setSelectedGameType('expo')}
                >
                  <Star size={18} />
                  <span>Co-Op Slide Pitch</span>
                </button>
                <button 
                  className={`btn btn-glass ${selectedGameType === 'tactical' ? 'btn-primary' : ''}`}
                  style={{ flex: 1, padding: '14px', flexDirection: 'column', gap: '6px' }}
                  onClick={() => setSelectedGameType('tactical')}
                >
                  <Zap size={18} />
                  <span>1v1 Tactical Comms</span>
                </button>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ padding: '12px', gap: '8px' }}
                onClick={createRoom}
                disabled={loading}
              >
                <Plus size={16} />
                <span>Initialize Match Lobby</span>
              </button>
            </div>
          </GlassCard>

          {/* Join Room Block */}
          <GlassCard className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
              Join Active Room
            </h3>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input 
                  type="text" 
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="ENTER 6-DIGIT ROOM CODE"
                  style={{ 
                    width: '100%', 
                    padding: '12px 12px 12px 42px', 
                    background: 'rgba(0,0,0,0.15)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: '0.1em',
                    fontSize: '14px'
                  }}
                />
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0 24px' }}
                onClick={joinRoom}
                disabled={loading}
              >
                <span>Connect</span>
              </button>
            </div>
          </GlassCard>

        </div>
      ) : (
        /* ACTIVE ROOM VIEW */
        <GlassCard className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Active Lobby Room
              </span>
              <h3 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                {activeLobby.roomCode}
              </h3>
            </div>
            
            <span style={{ 
              fontSize: '11px', 
              background: activeLobby.gameType === 'expo' ? 'rgba(99,102,241,0.1)' : 'rgba(236,72,153,0.1)', 
              color: activeLobby.gameType === 'expo' ? 'var(--color-primary)' : 'var(--color-accent)', 
              padding: '6px 12px', 
              borderRadius: '50px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {activeLobby.gameType === 'expo' ? 'Co-Op Presentation' : '1v1 Combat Comms'}
            </span>
          </div>

          {/* Connected players list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '32px' }}>👑</span>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '8px' }}>{activeLobby.player1.username}</h4>
              <p style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>Host / Speaker 1</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '20px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              {activeLobby.player2 ? (
                <>
                  <span style={{ fontSize: '32px' }}>🤝</span>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '8px' }}>{activeLobby.player2.username}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>Guest / Speaker 2</p>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Waiting for Partner...</p>
                  <button 
                    className="btn btn-glass" 
                    style={{ padding: '6px 12px', fontSize: '11px', gap: '6px' }}
                    onClick={addBotPlayer}
                  >
                    <Bot size={12} />
                    <span>Fill with Bot</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lobby Info / Ready panel */}
          <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={16} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              {activeLobby.player1.id === user.id 
                ? "Lobby is established. Once Player 2 or Bot joins, click the Start Match button to launch."
                : "Connected to Lobby. Waiting for Host to initiate the match sequence..."
              }
            </p>
          </div>

          {/* Control Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {activeLobby.player1.id === user.id && (
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '12px', gap: '6px' }}
                onClick={startMultiplayerGame}
                disabled={!activeLobby.player2}
              >
                <Play size={14} />
                <span>Start Match Session</span>
              </button>
            )}
            <button className="btn btn-glass" style={{ flex: 1, padding: '12px' }} onClick={leaveLobby}>
              <span>{activeLobby.player1.id === user.id ? "Close Room" : "Leave Lobby"}</span>
            </button>
          </div>

        </GlassCard>
      )}

    </div>
  );
};
export default MultiplayerLobby;
