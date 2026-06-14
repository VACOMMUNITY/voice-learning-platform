import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { MicVisualizer } from '../components/MicVisualizer';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { 
  Award, ShieldAlert, Volume2, VolumeX, Radio, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TacticalDrill {
  radarSector: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  spotterPhrase: string[];
  defenderPhrase: string[];
  audioAlert: string;
}

const TACTICAL_DRILLS: TacticalDrill[] = [
  {
    radarSector: 'NE',
    spotterPhrase: ["enemy spotted northeast", "target northeast", "hostile northeast"],
    defenderPhrase: ["engage suppressive fire", "fire northeast", "shoot northeast"],
    audioAlert: "Hostile movement detected in Northeast quadrant."
  },
  {
    radarSector: 'S',
    spotterPhrase: ["under fire south", "mortar south", "attack south"],
    defenderPhrase: ["take cover", "deploy shield", "shield south"],
    audioAlert: "Heavy incoming artillery barrage from Southern sector."
  },
  {
    radarSector: 'NW',
    spotterPhrase: ["airdrop northwest", "crate northwest", "supply northwest"],
    defenderPhrase: ["secure supplies", "grab crate", "collect northwest"],
    audioAlert: "Support cargo payload descending in Northwest zone."
  }
];

interface TacticalClashProps {
  user: any;
  roomCode: string;
  isHost: boolean;
  onBack: () => void;
}

export const TacticalClash1v1: React.FC<TacticalClashProps> = ({ 
  user: _user, roomCode, isHost, onBack 
}) => {
  const [lobby, setLobby] = useState<any | null>(null);
  const [drillIdx, setDrillIdx] = useState(0);
  const [mode, setMode] = useState<'lobby' | 'combat' | 'complete'>('combat');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [role, setRole] = useState<'spotter' | 'defender'>('spotter');
  
  // Game states
  const [activeTarget, setActiveTarget] = useState<'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [drillStartTime, setDrillStartTime] = useState(0);

  // Radar sweeping visual
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarAngleRef = useRef(0);
  const radarAnimRef = useRef<number | null>(null);

  // TTS Narrator
  const [voiceSynthesizer, setVoiceSynthesizer] = useState<SpeechSynthesis | null>(null);
  const [isRadioOn, setIsRadioOn] = useState(true);

  const { showToast } = useNotification();
  const currentDrill = TACTICAL_DRILLS[drillIdx];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceSynthesizer(window.speechSynthesis);
    }

    // Allocate asymmetric roles: Host is Spotter, Guest is Defender
    setRole(isHost ? 'spotter' : 'defender');
    setDrillStartTime(performance.now());
    
    // Initial sync
    fetchLobbyState();

    // Start sync polling
    const interval = window.setInterval(() => {
      fetchLobbyState();
    }, 2000);

    return () => {
      clearInterval(interval);
      if (radarAnimRef.current) cancelAnimationFrame(radarAnimRef.current);
    };
  }, []);

  const speakAlert = (text: string) => {
    if (!isRadioOn || !voiceSynthesizer) return;
    voiceSynthesizer.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    voiceSynthesizer.speak(utterance);
  };

  const fetchLobbyState = async () => {
    try {
      const res = await api.get(`/multiplayer/room/${roomCode}`);
      setLobby(res);
      
      // Update target coordinate sync
      if (res.activeTarget !== undefined) setActiveTarget(res.activeTarget);
      if (res.status === 'complete' && mode !== 'complete') {
        triggerCompleteLocal();
      }

      // Bot Simulation handling
      if (res.player2 && res.player2.id === 'bot_player_vocal' && isHost) {
        handleBotReaction(res.activeTarget);
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    }
  };

  const syncLobbyState = async (updates: any) => {
    try {
      const res = await api.post('/multiplayer/sync', {
        roomCode,
        ...updates
      });
      setLobby(res);
    } catch (e) {
      console.warn('Sync failed:', e);
    }
  };

  // Bot response simulator
  const handleBotReaction = (target: string | null) => {
    if (!target) return;
    
    // Bot takes defender role, simulates hearing host callout and triggers shield
    speakTextBotSim(`Target sighted at sector ${target}! Deploying counter shields.`);
    
    setTimeout(async () => {
      // Clear active target, advance round
      await api.post('/multiplayer/sync', {
        roomCode,
        activeTarget: null,
        scores: { bot: (scores.bot || 0) + 150 }
      });
      
      showToast("Bot defender successfully protected sector!", "success");
      
      if (drillIdx < TACTICAL_DRILLS.length - 1) {
        setDrillIdx(prev => prev + 1);
        setDrillStartTime(performance.now());
      } else {
        syncLobbyState({ status: 'complete' });
        triggerCompleteLocal();
      }
    }, 3500);
  };

  const speakTextBotSim = (text: string) => {
    if (!voiceSynthesizer) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    voiceSynthesizer.speak(utterance);
  };

  const handleSpeechInput = (text: string, isFinal: boolean) => {
    if (!isFinal) {
      setLiveTranscript(text);
      return;
    }

    const lower = text.toLowerCase();
    const duration = Math.round(performance.now() - drillStartTime);

    if (role === 'spotter') {
      // Spotter looks at radar coordinate and calls it out
      let hit = false;
      currentDrill.spotterPhrase.forEach(phrase => {
        if (lower.includes(phrase)) hit = true;
      });

      if (hit) {
        showToast(`Sector called! Target ${currentDrill.radarSector} highlighted for Defender.`, 'success');
        speakAlert("Target tagged. Defender deploy shields.");
        
        // Sync target coordinates to database for Player 2 (Defender) to see
        syncLobbyState({ activeTarget: currentDrill.radarSector });
        setDrillStartTime(performance.now()); // reset clock for defender
      } else {
        showToast("Incorrect coordinate callout phrasing. Try again.", "info");
      }
    } else if (role === 'defender') {
      // Defender waits for active target from spotter and yells counter command
      if (!activeTarget) {
        showToast("Wait for Spotter coordinates alert first!", "info");
        return;
      }

      let hit = false;
      currentDrill.defenderPhrase.forEach(phrase => {
        if (lower.includes(phrase)) hit = true;
      });

      if (hit) {
        setReactionTimes(prev => [...prev, duration]);
        const scoreEarned = Math.max(50, 150 - Math.floor(duration / 100));
        setScores(prev => ({ ...prev, defender: (prev.defender || 0) + scoreEarned }));
        
        showToast(`🚨 Sector protected! Reaction: ${duration}ms`, 'success');
        speakAlert("Defenses established. Sector secure.");

        // Clear target, advance
        syncLobbyState({ activeTarget: null });
        
        if (drillIdx < TACTICAL_DRILLS.length - 1) {
          setDrillIdx(prev => prev + 1);
          setDrillStartTime(performance.now());
        } else {
          syncLobbyState({ status: 'complete' });
          triggerCompleteLocal();
        }
      } else {
        showToast("Incorrect defensive response callout.", "info");
      }
    }
  };

  const triggerCompleteLocal = () => {
    setMode('complete');
    confetti({
      particleCount: 150,
      spread: 80
    });
  };

  // Render sweep radar visual
  const drawRadar = () => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    const angleRad = (radarAngleRef.current * Math.PI) / 180;
    radarAngleRef.current = (radarAngleRef.current + 3) % 360;

    // Draw Radar rings
    ctx.strokeStyle = 'rgba(6,182,212,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.6, 0, 2 * Math.PI);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(center, 4);
    ctx.lineTo(center, size - 4);
    ctx.moveTo(4, center);
    ctx.lineTo(size - 4, center);
    ctx.stroke();

    // Sweep line
    ctx.strokeStyle = 'rgba(6,182,212,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + Math.cos(angleRad) * radius,
      center + Math.sin(angleRad) * radius
    );
    ctx.stroke();

    // Render target if in spotter mode
    if (role === 'spotter' && mode === 'combat') {
      let targetX = center;
      let targetY = center;

      switch (currentDrill.radarSector) {
        case 'N': targetY = center - radius * 0.7; break;
        case 'NE': targetX = center + radius * 0.5; targetY = center - radius * 0.5; break;
        case 'E': targetX = center + radius * 0.7; break;
        case 'SE': targetX = center + radius * 0.5; targetY = center + radius * 0.5; break;
        case 'S': targetY = center + radius * 0.7; break;
        case 'SW': targetX = center - radius * 0.5; targetY = center + radius * 0.5; break;
        case 'W': targetX = center - radius * 0.7; break;
        case 'NW': targetX = center - radius * 0.5; targetY = center - radius * 0.5; break;
      }

      ctx.fillStyle = 'rgba(239,68,68,0.8)';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 8 + Math.sin(Date.now() * 0.01) * 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    radarAnimRef.current = requestAnimationFrame(drawRadar);
  };

  useEffect(() => {
    if (mode === 'combat') {
      drawRadar();
    }
    return () => {
      if (radarAnimRef.current) cancelAnimationFrame(radarAnimRef.current);
    };
  }, [mode, drillIdx]);

  if (!lobby) {
    return (
      <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw className="spin" size={32} />
        <p style={{ marginTop: '12px' }}>Loading tactical link...</p>
      </GlassCard>
    );
  }

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 'bold' }}>LOBBY: {lobby.roomCode}</span>
          <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Tactical Coordination Duel</h3>
        </div>
        <button onClick={onBack} className="btn btn-glass" style={{ padding: '8px 16px' }}>
          <span>Close Arena</span>
        </button>
      </div>

      {mode === 'combat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Role and Alert panel */}
          <GlassCard 
            className="glass-panel" 
            style={{ 
              padding: '20px', 
              borderLeft: role === 'spotter' ? '5px solid var(--color-primary)' : '5px solid var(--color-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-subtle)' }}>Active Combat Role</span>
              <h4 style={{ fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', color: role === 'spotter' ? 'var(--color-primary)' : 'var(--color-secondary)' }}>
                {role === 'spotter' ? "🛰️ Spotter (Radar Link)" : "🛡️ Defender (Shield Array)"}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {role === 'spotter' 
                  ? "Locate hostiles on radar and call coordinates to partner." 
                  : "Listen to Spotter's callout and activate counter shields immediately."
                }
              </p>
            </div>
            
            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold' }}>
              Wave {drillIdx + 1} / {TACTICAL_DRILLS.length}
            </span>
          </GlassCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', alignItems: 'center' }}>
            
            {/* Visual Radar Feed (Spotter sees sweeping coordinate, Defender has blank radar sync state) */}
            <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {role === 'spotter' ? "ACTIVE COORDINATE RADAR" : "TACTICAL STATUS INDICATOR"}
              </h4>
              {role === 'spotter' ? (
                <canvas 
                  ref={radarCanvasRef} 
                  width={240} 
                  height={240} 
                  style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '50%', border: '2px solid var(--border-glass)' }}
                />
              ) : (
                <div style={{ 
                  width: '240px', 
                  height: '240px', 
                  borderRadius: '50%', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '2.5px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {activeTarget ? (
                    <>
                      <ShieldAlert size={48} className="pulse" style={{ color: 'var(--color-secondary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
                        ALERT: SECTOR_{activeTarget} ACTIVE!
                      </span>
                    </>
                  ) : (
                    <>
                      <Radio size={48} style={{ color: 'var(--text-subtle)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                        Waiting for Spotter Callout...
                      </span>
                    </>
                  )}
                </div>
              )}
            </GlassCard>

            {/* Speaking instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <GlassCard className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-primary)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Required Voice Coordinate Callout
                </span>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '8px' }}>
                  {role === 'spotter' 
                    ? `Say: "${currentDrill.spotterPhrase[0]}" or "${currentDrill.spotterPhrase[1]}"`
                    : `Listen to partner and say: "${currentDrill.defenderPhrase[0]}"`
                  }
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                  {role === 'spotter' ? (
                    currentDrill.spotterPhrase.map((p, i) => (
                      <span key={i} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                        "{p}"
                      </span>
                    ))
                  ) : (
                    currentDrill.defenderPhrase.map((p, i) => (
                      <span key={i} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                        "{p}"
                      </span>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>

          </div>

          {/* Comms voice capture */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <MicVisualizer 
              onTranscript={handleSpeechInput}
              placeholderText="Tap microphone and speak tactical orders..."
            />
            {liveTranscript && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Radio Transmission:</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary)' }}>"{liveTranscript}"</span>
              </div>
            )}
          </GlassCard>

          {/* Toggle sounds */}
          <GlassCard className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn btn-glass" 
                style={{ padding: '6px' }}
                onClick={() => setIsRadioOn(prev => !prev)}
              >
                {isRadioOn ? <Volume2 size={16} style={{ color: 'var(--color-primary)' }} /> : <VolumeX size={16} />}
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Radio Static Audio Alert</span>
            </div>
            
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 'bold' }}>
              COORDINATION LATENCY TRACKING ON
            </span>
          </GlassCard>

        </div>
      )}

      {mode === 'complete' && (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Award size={48} className="float-animation" />
          </div>

          <h3 style={{ fontSize: '28px', fontWeight: 800 }} className="gradient-title">
            Tactical Wave Defended!
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '360px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Avg Latency</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-secondary)', marginTop: '4px' }}>
                {reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0}ms
              </h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Team Sync Score</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-success)', marginTop: '4px' }}>
                {scores.defender || 0} pts
              </h4>
            </div>
          </div>

          <button className="btn btn-primary" style={{ padding: '10px 24px', margin: '0 auto' }} onClick={onBack}>
            Return to Lobby
          </button>
        </GlassCard>
      )}

    </div>
  );
};
export default TacticalClash1v1;
