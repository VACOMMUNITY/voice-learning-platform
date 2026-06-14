import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { MicVisualizer } from '../components/MicVisualizer';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { 
  ShieldAlert, Volume2, Award, ChevronLeft, VolumeX, Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TacticalDrill {
  id: string;
  scenario: string;
  radarSector: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  clockDirection: string;
  expectedKeywords: string[];
  speechHelp: string;
  hindiHelp: string;
  tamilHelp: string;
  audioPrompt: string;
}

const TACTICAL_DRILLS: TacticalDrill[] = [
  {
    id: 'd1',
    scenario: "🔴 TARGET INCOMING! Visual reports verify hostile squad advancing rapid on the high ridge sector.",
    radarSector: 'NE',
    clockDirection: "2 o'clock",
    expectedKeywords: ["enemy spotted", "target spotted", "hostile", "ridge", "शत्रु", "दुश्मन", "எதிரி", "இலக்கு"],
    speechHelp: "Say: 'Enemy spotted at 2 o'clock' or 'Hostile ridge'",
    hindiHelp: "बोलें: 'दुश्मन स्पॉट किया' या 'शत्रु'",
    tamilHelp: "கூறுக: 'எதிரி வந்துவிட்டான்' அல்லது 'இலக்கு'",
    audioPrompt: "Enemy activity reported on the high ridge."
  },
  {
    id: 'd2',
    scenario: "💥 UNDER FIRE! Mortar fragmentation and fire suppressing your current standard defensive barrier.",
    radarSector: 'S',
    clockDirection: "6 o'clock",
    expectedKeywords: ["take cover", "fall back", "cover", "retreat", "shield", "बचाओ", "कवर लो", "மறைவிடம்", "கவசம்"],
    speechHelp: "Say: 'Take cover' or 'Fall back to secondary shield'",
    hindiHelp: "बोलें: 'कवर लो' या 'पीछे हटो'",
    tamilHelp: "கூறுக: 'மறைவிடம் தேடு' அல்லது 'கவசம் போடு'",
    audioPrompt: "Incoming fire. Deploy defensive cover."
  },
  {
    id: 'd3',
    scenario: "📦 SUPPLY AIRDROP! Logistics crate parachute landing on open marsh fields.",
    radarSector: 'NW',
    clockDirection: "10 o'clock",
    expectedKeywords: ["airdrop", "supplies", "loot crate", "grab gear", "सामान", "एयरड्रॉप", "சப்ளை", "பாக்ஸ்"],
    speechHelp: "Say: 'Secure airdrop supplies' or 'Grab gear northwest'",
    hindiHelp: "बोलें: 'एयरड्रॉप सुरक्षित करें' या 'लूट कलेक्ट'",
    tamilHelp: "கூறுக: 'சப்ளை பெட்டி எடு' அல்லது 'பொருட்களை எடு'",
    audioPrompt: "Supply drop is landing northwest."
  },
  {
    id: 'd4',
    scenario: "🔥 FLANK ENEMY TEAM! Opposing scouts are highly exposed from the eastern brick factory wall.",
    radarSector: 'E',
    clockDirection: "3 o'clock",
    expectedKeywords: ["flank left", "flank right", "suppressive fire", "attack", "हथियार", "हमला करो", "தாக்கு", "சுடு"],
    speechHelp: "Say: 'Flank left' or 'Deliver suppressive fire east'",
    hindiHelp: "बोलें: 'हमला करो' या 'सप्रेसिव फायर'",
    tamilHelp: "கூறுக: 'தாக்குதல் நடத்து' அல்லது 'சுடு'",
    audioPrompt: "Execute tactical flanking maneuver now."
  }
];

interface CompanionModeProps {
  user: any;
  onBack: () => void;
}

export const CompanionMode: React.FC<CompanionModeProps> = ({ user: _user, onBack }) => {
  const [currentDrillIdx, setCurrentDrillIdx] = useState(0);
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillScore, setDrillScore] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [accuracyScores, setAccuracyScores] = useState<number[]>([]);
  
  const [drillStartTime, setDrillStartTime] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'hi-IN' | 'ta-IN'>('en-US');
  const [liveSpeech, setLiveSpeech] = useState('');
  
  // Radar sweep animation
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [radarAngle, setRadarAngle] = useState(0);
  const radarAnimRef = useRef<number | null>(null);

  // Audio synthed feedback
  const [voiceSynthesizer, setVoiceSynthesizer] = useState<SpeechSynthesis | null>(null);
  const [isAudioFeedbackActive, setIsAudioFeedbackActive] = useState(true);

  const { showToast } = useNotification();
  const currentDrill = TACTICAL_DRILLS[currentDrillIdx];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceSynthesizer(window.speechSynthesis);
    }
  }, []);

  // Programmatic TTS Speak
  const speakAlert = (text: string) => {
    if (!isAudioFeedbackActive || !voiceSynthesizer) return;
    voiceSynthesizer.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.0;
    voiceSynthesizer.speak(utterance);
  };

  // Render original custom radar grid
  const drawRadar = () => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    // Dynamic sweeping line angle calculation
    const angleRad = (radarAngle * Math.PI) / 180;
    setRadarAngle(prev => (prev + 2.5) % 360);

    // Draw Radar outer circles
    ctx.strokeStyle = 'rgba(6,182,212,0.18)';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.65, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.35, 0, 2 * Math.PI);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(center, 4);
    ctx.lineTo(center, size - 4);
    ctx.moveTo(4, center);
    ctx.lineTo(size - 4, center);
    ctx.stroke();

    // Sweep line gradient glow
    ctx.strokeStyle = 'rgba(6,182,212,0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + Math.cos(angleRad) * radius,
      center + Math.sin(angleRad) * radius
    );
    ctx.stroke();

    // Highlight sector coordinate if drill is actively waiting
    if (isDrillActive && !isSessionComplete) {
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

      // Draw flashing hot target indicator on simulated map
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(239,68,68,0.8)';
      ctx.fillStyle = 'rgba(239,68,68,0.7)';
      
      ctx.beginPath();
      ctx.arc(targetX, targetY, 8 + Math.sin(Date.now() * 0.01) * 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw label text next to pulsing pixel
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`HOSTILE_${currentDrill.radarSector}`, targetX + 12, targetY + 3);
    }

    radarAnimRef.current = requestAnimationFrame(drawRadar);
  };

  useEffect(() => {
    drawRadar();
    return () => {
      if (radarAnimRef.current) cancelAnimationFrame(radarAnimRef.current);
    };
  }, [isDrillActive, currentDrillIdx, radarAngle]);

  const startSession = () => {
    setCurrentDrillIdx(0);
    setDrillScore(0);
    setReactionTimes([]);
    setAccuracyScores([]);
    setIsSessionComplete(false);
    setIsDrillActive(true);
    setDrillStartTime(performance.now());
    
    // Announce audio tactical alert
    setTimeout(() => {
      speakAlert(`Red alert. tactical communication companion activated. Drill 1 incoming: ${TACTICAL_DRILLS[0].audioPrompt}`);
    }, 300);
  };

  const handleSpeechInput = (recognizedText: string, isFinal: boolean) => {
    if (!isDrillActive || isSessionComplete) return;

    setLiveSpeech(recognizedText);

    if (!isFinal) return; // wait for full vocal pause

    const spokenLower = recognizedText.toLowerCase();
    
    // Scan keywords
    let hitFound = false;
    for (let word of currentDrill.expectedKeywords) {
      if (spokenLower.includes(word.toLowerCase())) {
        hitFound = true;
        break;
      }
    }

    const duration = Math.round(performance.now() - drillStartTime);
    
    if (hitFound) {
      // Calculate speed & precision quotients
      const reactionScore = Math.max(100 - Math.floor(duration / 120), 40); // high points for sub-second responses!
      setReactionTimes(prev => [...prev, duration]);
      setAccuracyScores(prev => [...prev, reactionScore]);

      const stepTotal = reactionScore * 10;
      setDrillScore(prev => prev + stepTotal);

      showToast(`🔥 Targeted! Reaction: ${duration}ms. Alignment score: ${reactionScore}%`, 'success');
      speakAlert("Target confirmed. Sector clear.");

      // Advance
      if (currentDrillIdx < TACTICAL_DRILLS.length - 1) {
        setCurrentDrillIdx(prev => prev + 1);
        setDrillStartTime(performance.now());
        setLiveSpeech('');
        
        setTimeout(() => {
          speakAlert(`Alert. Next sector objective: ${TACTICAL_DRILLS[currentDrillIdx + 1].audioPrompt}`);
        }, 1500);
      } else {
        handleSessionEnd();
      }
    } else {
      // Speech recognized but did not coordinate correctly with shooter battle sector keywords
      showToast("Incorrect voice coordinate. Relocate target visual and speak combat callout.", "info");
      speakAlert("Invalid coordinate. Repeat callout.");
    }
  };

  const handleSessionEnd = async () => {
    setIsSessionComplete(true);
    setIsDrillActive(false);
    confetti({
      particleCount: 120,
      colors: ['#06b6d4', '#6366f1', '#ec4899']
    });

    const averageReaction = reactionTimes.length > 0 
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
      : 1200;

    const averageAccuracy = accuracyScores.length > 0 
      ? Math.round(accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length) 
      : 80;

    speakAlert(`Drill session complete. Elite communication badge unlocked. Average vocal response latency: ${averageReaction} milliseconds.`);

    try {
      await api.post('/games/scores', {
        gameType: 'pronunciation', // logging as shooter communication pronunciation
        score: drillScore,
        difficulty: 'advanced',
        accuracy: averageAccuracy
      });
      
      await api.post('/games/voice-logs', {
        command: `companion_tactical_complete`,
        textRecognized: `Average reaction: ${averageReaction}ms. Strategic accuracy: ${averageAccuracy}%`,
        status: 'success'
      });
    } catch (err) {
      console.error("Score persist failed:", err);
    }
  };

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={onBack} 
          className="btn btn-glass"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <ChevronLeft size={16} />
          <span>Exit Tactical Simulator</span>
        </button>

        {/* Global Multi-lingual Switch panel */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-subtle)' }}>TACTICAL LINGO:</span>
          <select 
            value={language} 
            onChange={(e) => {
              const lang = e.target.value as any;
              setLanguage(lang);
              speakAlert(`Tactical language updated.`);
            }} 
            style={{ 
              background: 'rgba(255,255,255,0.04)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--border-glass)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <option value="en-US">English (en-US)</option>
            <option value="hi-IN">Hindi (hi-IN) - हिंदी</option>
            <option value="ta-IN">Tamil (ta-IN) - தமிழ்</option>
          </select>
        </div>
      </div>

      {/* NO ACTIVE DRILL VIEW */}
      {!isDrillActive && !isSessionComplete && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', textAlign: 'center' }}>
          <div>
            <h2 className="gradient-title" style={{ fontSize: '32px', fontWeight: 800 }}>
              Tactical Game Companion
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Train reaction speeds, situational awareness, and voice communication stress metrics using battle-royale inspires simulated grids.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'center' }}>
            
            {/* Left Description Card */}
            <GlassCard className="glass-panel" style={{ padding: '32px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-accent)' }}>
                <ShieldAlert size={20} />
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>Real-world Tactical Gaming Skill Core</h4>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Professional competitive e-sports requires ultra-low delay voice commands and impeccable team coordination calls. This training layer helps you build:
              </p>
              <ul style={{ fontSize: '13px', color: 'var(--text-main)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>⚡ **Situational Stress Management**: Call out coordinates while hearing alarm sounds.</li>
                <li>🎯 **Vocal Clarity**: Minimize misheard orders through crisp diction commands.</li>
                <li>🔊 **Team Leadership**: Formulate quick tactical decisions during active sweeps.</li>
              </ul>
              
              <button className="btn btn-primary" style={{ padding: '12px', fontSize: '14px', marginTop: '12px' }} onClick={startSession}>
                <Radio size={16} className="pulse" />
                <span>Initialize Tactical Grid Drills</span>
              </button>
            </GlassCard>

            {/* Right Static Radar Grid visual */}
            <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <canvas 
                  ref={radarCanvasRef} 
                  width={240} 
                  height={240} 
                  style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '50%', border: '2px solid var(--border-glass)' }}
                />
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--color-secondary)' }}>
                  <span className="pulse-ring" style={{ width: '6px', height: '6px', background: 'var(--color-secondary)' }} />
                  <span>RADAR_SWEEPER_ONLINE</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ACTIVE BATTLE DRILL MODE */}
      {isDrillActive && !isSessionComplete && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={14} className="pulse" />
              <span>Tactical Scenario: {currentDrillIdx + 1} of {TACTICAL_DRILLS.length}</span>
            </span>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
              Tactical Score: {drillScore} pts
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* Left simulated radar map */}
            <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <canvas 
                ref={radarCanvasRef} 
                width={280} 
                height={280} 
                style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '50%', border: '2px solid var(--border-glass)' }}
              />
              <div style={{ position: 'absolute', bottom: '16px', display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>GRID: ALPHA_ZONE_9</span>
                <span>•</span>
                <span>MAP: MOCK_OUTPOST</span>
              </div>
            </GlassCard>

            {/* Right target data instructions card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <GlassCard className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #ef4444' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={14} />
                  <span>ALERT COORDINATE DETECTED</span>
                </span>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '8px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                  {currentDrill.scenario}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Compass Zone</span>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-secondary)', marginTop: '2px' }}>{currentDrill.radarSector} Sector</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Clock Angle</span>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)', marginTop: '2px' }}>{currentDrill.clockDirection}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Callout help panel */}
              <GlassCard className="glass-panel" style={{ padding: '20px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                  Required Vocal Action Callout
                </span>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-success)', marginTop: '6px' }}>
                  {language === 'en-US' ? currentDrill.speechHelp : 
                   language === 'hi-IN' ? currentDrill.hindiHelp : 
                   currentDrill.tamilHelp}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                  {currentDrill.expectedKeywords.slice(0, 3).map((kw, i) => (
                    <span key={i} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                      "{kw}"
                    </span>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* REALTIME MIC WAVE CAPTURING */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <MicVisualizer 
              onTranscript={handleSpeechInput}
              placeholderText="Tap microphone and bark tactical orders / callouts into the comms radio..."
            />

            {liveSpeech && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)', marginRight: '6px' }}>Tactical Comms:</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-accent)' }}>"{liveSpeech}"</span>
              </div>
            )}
          </GlassCard>

          {/* AUDIO FEEDBACK TOGGLE DOCK */}
          <GlassCard className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn btn-glass" 
                style={{ padding: '6px' }}
                onClick={() => setIsAudioFeedbackActive(prev => !prev)}
                title="Toggle radio static alerts sound effect"
              >
                {isAudioFeedbackActive ? <Volume2 size={16} style={{ color: 'var(--color-accent)' }} /> : <VolumeX size={16} />}
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tactical Comms Feed Audio</span>
            </div>
            
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-ring" style={{ width: '8px', height: '8px', background: 'var(--color-success)' }} />
              <span>REACTION SENSOR ACTIVE (MS)</span>
            </div>
          </GlassCard>
        </div>
      )}

      {/* SESSION COMPLETED RESULT BOARD */}
      {isSessionComplete && (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Award size={48} className="float-animation" />
          </div>

          <div>
            <h3 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-heading)' }} className="gradient-title">
              Tactical Training Concluded
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Excellent leadership calls. You successfully aligned situational stress parameters and verbal commands.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Drill Score</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-accent)', marginTop: '4px' }}>{drillScore} pts</h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Avg Latency</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-secondary)', marginTop: '4px' }}>
                {reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0}ms
              </h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Call Clarity</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-success)', marginTop: '4px' }}>
                {accuracyScores.length > 0 ? Math.round(accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length) : 0}%
              </h4>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={startSession}>
              Re-run Comms Drills
            </button>
            <button className="btn btn-glass" style={{ padding: '10px 24px' }} onClick={onBack}>
              Dashboard
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
export default CompanionMode;
