import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { MicVisualizer } from '../components/MicVisualizer';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { 
  Award, UserCheck, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProjectExpoDetail {
  title: string;
  category: string;
  slides: {
    title: string;
    content: string;
    keywords: string[];
    hint: string;
  }[];
  questions: {
    judge: string;
    avatar: string;
    role: string;
    text: string;
    expectedKeywords: string[];
  }[];
}

const PROJECTS_DATA: ProjectExpoDetail[] = [
  {
    title: "⚡ Smart IoT Welding Assistant",
    category: "Industrial Automation & Safety",
    slides: [
      {
        title: "Slide 1: Vision (P1)",
        content: "Welding operations require precise electrode striking distance and constant shielding gas flow. Inexperienced trainees face arc length errors, gas leaks, and physical eye injuries.",
        keywords: ["shielding gas", "trainees", "arc length", "eye injuries"],
        hint: "P1: Explain the problem (e.g. say 'Trainees face arc length errors')"
      },
      {
        title: "Slide 2: Architecture (P2)",
        content: "Our device uses an ESP32 microcontroller paired with a solenoid valve to isolate the gas supply. An OLED display provides real-time feedback, and sensors measure thermal threshold safety.",
        keywords: ["esp32", "solenoid", "oled", "sensors", "thermal"],
        hint: "P2: Explain components (e.g. say 'ESP32 and solenoid valve isolate gas')"
      },
      {
        title: "Slide 3: Safety Redundancies (P1)",
        content: "Built-in automatic high-voltage breaker shutdown acts within 50 milliseconds of detection of short-circuit risks. Dual fan ventilation vents exhaust gas fumes from the welding cabin.",
        keywords: ["breaker", "shutdown", "ventilation", "fumes", "short-circuit"],
        hint: "P1: Explain safety (e.g. say 'Breaker shutdown stops short-circuits')"
      }
    ],
    questions: [
      {
        judge: "Prof. Vikram Sarabhai",
        avatar: "👴",
        role: "Head of Engineering",
        text: "P1: How does your ESP32 controller monitor the arc length in real-time?",
        expectedKeywords: ["voltage", "analog", "feedback", "resistance"]
      },
      {
        judge: "Officer Meera Sen",
        avatar: "👩‍✈️",
        role: "Industrial Safety Auditor",
        text: "P2: In the event of a ventilation failure, what redundant safety measures does your system trigger?",
        expectedKeywords: ["solenoid", "valve", "shutoff", "shut down", "isolate"]
      }
    ]
  }
];

interface CoOpProjectExpoProps {
  user: any;
  roomCode: string;
  isHost: boolean;
  onBack: () => void;
}

export const CoOpProjectExpo: React.FC<CoOpProjectExpoProps> = ({ 
  user, roomCode, isHost, onBack 
}) => {
  const [lobby, setLobby] = useState<any | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [mode, setMode] = useState<'presentation' | 'qna' | 'grading'>('presentation');
  const [recognizedKeywords, setRecognizedKeywords] = useState<string[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  // Scores
  const [pitchScore, setPitchScore] = useState(0);
  const [qnaScore, setQnaScore] = useState(0);

  // Audio narrator settings
  const [voiceSynthesizer, setVoiceSynthesizer] = useState<SpeechSynthesis | null>(null);
  const [isNarratorActive] = useState(true);

  const { showToast } = useNotification();
  const currentProject = PROJECTS_DATA[0];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceSynthesizer(window.speechSynthesis);
    }
    
    // Initial fetch
    fetchLobbyState();

    // Set polling to sync slide states and turns
    const interval = window.setInterval(() => {
      fetchLobbyState();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const speakText = (text: string) => {
    if (!isNarratorActive || !voiceSynthesizer) return;
    voiceSynthesizer.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    voiceSynthesizer.speak(utterance);
  };

  const fetchLobbyState = async () => {
    try {
      const res = await api.get(`/multiplayer/room/${roomCode}`);
      setLobby(res);
      
      // Update local indexes based on backend sync
      if (res.currentSlideIdx !== undefined) setCurrentSlideIdx(res.currentSlideIdx);
      if (res.recognizedKeywords !== undefined) setRecognizedKeywords(res.recognizedKeywords);
      if (res.status === 'complete' && mode !== 'grading') {
        triggerGradingLocal();
      }

      // Check if active turn belongs to BOT, if so trigger simulated Bot action
      if (res.activeTurn === 'bot_player_vocal' && isHost) {
        triggerBotPresenterAction(res.currentSlideIdx);
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

  // Bot Auto presenter simulator
  const triggerBotPresenterAction = (slideIdx: number) => {
    // Only host triggers the bot timeout to prevent duplicate calls
    if (lobby?.activeTurn !== 'bot_player_vocal') return;
    
    speakText("Rival Vocalizer Bot taking over pitch presentation.");
    showToast("Bot is speaking...", "info");

    setTimeout(async () => {
      // Collect slide keywords to simulate a bot pitch
      const keywords = currentProject.slides[slideIdx].keywords;
      const botKeywords = [keywords[0], keywords[1]];
      
      const newKeywords = [...recognizedKeywords, ...botKeywords];
      
      // Bot completes and passes turn back to host
      await api.post('/multiplayer/sync', {
        roomCode,
        currentSlideIdx: Math.min(slideIdx + 1, currentProject.slides.length - 1),
        recognizedKeywords: newKeywords,
        activeTurn: lobby.player1.id,
        scores: { bot: 80 }
      });
      
      speakText("Bot pitch completed. Passing turn back to you.");
      showToast("Bot passed turn to Partner.", "success");
      fetchLobbyState();
    }, 4500);
  };

  const handleVoiceCommand = (rawText: string) => {
    if (!lobby || lobby.activeTurn !== user.id) return; // not your turn!
    
    const textLower = rawText.toLowerCase();

    // Turn Handover command
    if (textLower.includes("pass to partner") || textLower.includes("पार्टनर") || textLower.includes("மாற்று")) {
      const nextSpeaker = lobby.player2 ? lobby.player2.id : 'bot_player_vocal';
      syncLobbyState({ activeTurn: nextSpeaker });
      speakText("Passing slide presentation control to partner.");
      showToast("Slide control passed.", "success");
      return;
    }

    // Slide navigation
    if (textLower.includes("next slide")) {
      if (currentSlideIdx < currentProject.slides.length - 1) {
        const nextSlide = currentSlideIdx + 1;
        syncLobbyState({ currentSlideIdx: nextSlide });
        speakText(`Next slide: Slide ${nextSlide + 1}`);
      } else {
        speakText("You are on final slide. Say 'Finish Presentation' to enter Q&A.");
      }
      return;
    }

    if (textLower.includes("finish presentation")) {
      setMode('qna');
      speakText("Commencing cooperative Q&A. Question 1 goes to Player 1.");
      return;
    }

    // Keyword check
    const currentSlide = currentProject.slides[currentSlideIdx];
    let newMatches: string[] = [];
    currentSlide.keywords.forEach(kw => {
      if (textLower.includes(kw) && !recognizedKeywords.includes(kw)) {
        newMatches.push(kw);
      }
    });

    if (newMatches.length > 0) {
      const updated = [...recognizedKeywords, ...newMatches];
      setPitchScore(prev => prev + newMatches.length * 15);
      syncLobbyState({ recognizedKeywords: updated });
      showToast(`Concept matched: ${newMatches.join(', ')}`, 'success');
    }
  };

  const handleSpeechResult = (text: string, isFinal: boolean) => {
    if (!isFinal) {
      setLiveTranscript(text);
      return;
    }

    if (mode === 'presentation') {
      handleVoiceCommand(text);
    } else if (mode === 'qna') {
      // Q&A logic: Host answers question 1, Guest answers question 2
      const questionIdx = isHost ? 0 : 1;
      const expected = currentProject.questions[questionIdx].expectedKeywords;
      const lower = text.toLowerCase();

      let hits = 0;
      expected.forEach(kw => {
        if (lower.includes(kw)) hits++;
      });

      const qScore = hits * 40;
      setQnaScore(qScore);
      showToast(`Question defended! Impendance match: ${qScore}%`, 'success');
      
      // Finish session
      setTimeout(async () => {
        syncLobbyState({ status: 'complete' });
        triggerGradingLocal();
      }, 1500);
    }
  };

  const triggerGradingLocal = () => {
    setMode('grading');
    confetti({
      particleCount: 150,
      colors: ['#6366f1', '#10b981']
    });
    speakText("Cooperative Project Expo grade calculated successfully.");
  };

  if (!lobby) {
    return (
      <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw className="spin" size={32} />
        <p style={{ marginTop: '12px' }}>Connecting to lobby stream...</p>
      </GlassCard>
    );
  }

  const isMyTurn = lobby.activeTurn === user.id;
  const currentSlide = currentProject.slides[currentSlideIdx];

  return (
    <div style={{ maxWidth: '850px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold' }}>LOBBY: {lobby.roomCode}</span>
          <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Co-Op Pitch Arena</h3>
        </div>
        <button onClick={onBack} className="btn btn-glass" style={{ padding: '8px 16px' }}>
          <span>Close Arena</span>
        </button>
      </div>

      {mode === 'presentation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Turn Alert Header */}
          <GlassCard 
            className="glass-panel" 
            glow={isMyTurn}
            style={{ 
              padding: '16px', 
              borderLeft: isMyTurn ? '5px solid var(--color-success)' : '5px solid var(--color-accent)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={18} style={{ color: isMyTurn ? 'var(--color-success)' : 'var(--color-accent)' }} />
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 'bold' }}>
                  {isMyTurn ? "🚨 IT'S YOUR TURN TO PITCH!" : "⏳ PARTNER IS PRESENTING"}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {isMyTurn 
                    ? "Speak slide concepts clearly. Yell 'Pass to Partner' when done." 
                    : `Active presenter: ${lobby.activeTurn === 'bot_player_vocal' ? 'Rival Bot' : 'Partner'}`
                  }
                </p>
              </div>
            </div>
            
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              Slide {currentSlideIdx + 1} / {currentProject.slides.length}
            </span>
          </GlassCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
            
            {/* Presentation Slide */}
            <GlassCard className="glass-panel" style={{ padding: '36px', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 'bold' }}>COOPERATIVE DECK</span>
                <h4 style={{ fontSize: '20px', fontWeight: 800, marginTop: '8px', color: 'var(--color-primary)' }}>
                  {currentSlide.title}
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--text-main)', marginTop: '16px', lineHeight: 1.6 }}>
                  {currentSlide.content}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Say: **"Pass to Partner"** to handover turn
                </span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Sync Active</span>
              </div>
            </GlassCard>

            {/* Turn checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <GlassCard className="glass-panel" style={{ padding: '24px', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Expected Slide Concepts
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {currentSlide.keywords.map((kw, i) => {
                    const isChecked = recognizedKeywords.includes(kw);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <div style={{ 
                          width: '14px', 
                          height: '14px', 
                          borderRadius: '4px', 
                          border: '1.5px solid var(--border-glass)',
                          background: isChecked ? 'var(--color-success)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '9px'
                        }}>
                          {isChecked && "✓"}
                        </div>
                        <span style={{ color: isChecked ? 'var(--text-main)' : 'var(--text-muted)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                          "{kw}"
                        </span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>

          </div>

          {/* Comms voice capture */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <MicVisualizer 
              onTranscript={handleSpeechResult}
              placeholderText={isMyTurn ? "Present slide deck or say 'Pass to Partner'..." : "Listen to partner pitch..."}
            />
            {liveTranscript && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Presenter Vocals:</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary)' }}>"{liveTranscript}"</span>
              </div>
            )}
          </GlassCard>

        </div>
      )}

      {/* MODE 2: Q&A DEFENSE */}
      {mode === 'qna' && (
        <GlassCard className="glass-panel" style={{ padding: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span style={{ fontSize: '48px' }}>👴</span>
          <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Cooperative Q&A Defense</h3>
          
          <p style={{ fontSize: '16px', fontWeight: 600 }}>
            {isHost 
              ? `Host: Answer question: "${currentProject.questions[0].text}"`
              : `Guest: Answer question: "${currentProject.questions[1].text}"`
            }
          </p>

          <MicVisualizer 
            onTranscript={handleSpeechResult}
            placeholderText="Speak answer defense..."
          />
        </GlassCard>
      )}

      {/* MODE 3: GRADING */}
      {mode === 'grading' && (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Award size={48} className="float-animation" />
          </div>

          <h3 style={{ fontSize: '28px', fontWeight: 800 }} className="gradient-title">
            Team Expo Graded!
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '360px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Pitch Score</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '4px' }}>{pitchScore} pts</h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Q&A Defense</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-success)', marginTop: '4px' }}>{qnaScore} pts</h4>
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
export default CoOpProjectExpo;
