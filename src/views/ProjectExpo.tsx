import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { MicVisualizer } from '../components/MicVisualizer';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { 
  Award, Presentation, Volume2, VolumeX, ChevronLeft, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProjectExpoDetail {
  title: string;
  category: string;
  problem: string;
  solution: string;
  components: string[];
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
    sampleAnswer: string;
  }[];
}

const PROJECTS_DATA: ProjectExpoDetail[] = [
  {
    title: "⚡ Smart IoT Welding Assistant",
    category: "Industrial Automation & Safety",
    problem: "Manual welding has high defect rates due to poor arc length control, and severe gas inhalation hazards for apprentice trainees.",
    solution: "A voice-guided assistive welding system monitoring real-time voltage/thermal profiles, with auto-shutoff safety breakers and local voice feedback.",
    components: ["Voltage Regulator", "Microcontroller ESP32", "Peltier Cooling Array", "Solenoid Gas Valve"],
    slides: [
      {
        title: "Slide 1: Problem Statement & Vision",
        content: "Welding operations require precise electrode striking distance and constant shielding gas flow. Inexperienced trainees face arc length errors, gas leaks, and physical eye injuries.",
        keywords: ["shielding gas", "trainees", "arc length", "eye injuries"],
        hint: "Explain the problem trainees face (e.g. say 'Trainees face arc length errors and gas leak hazards')"
      },
      {
        title: "Slide 2: System Architecture & Circuitry",
        content: "Our device uses an ESP32 microcontroller paired with a solenoid valve to isolate the gas supply. An OLED display provides real-time feedback, and sensors measure thermal threshold safety.",
        keywords: ["esp32", "solenoid", "oled", "sensors", "thermal"],
        hint: "Explain the components (e.g. say 'Our circuit integrates ESP32 microcontrollers, OLED displays, and thermal sensors')"
      },
      {
        title: "Slide 3: Real-world Safety Features",
        content: "Built-in automatic high-voltage breaker shutdown acts within 50 milliseconds of detection of short-circuit risks. Dual fan ventilation vents exhaust gas fumes from the welding cabin.",
        keywords: ["breaker", "shutdown", "ventilation", "fumes", "short-circuit"],
        hint: "Explain safety features (e.g. say 'Automatic breaker shuts down power and ventilation fans clear hazardous fumes')"
      }
    ],
    questions: [
      {
        judge: "Prof. Vikram Sarabhai",
        avatar: "👴",
        role: "Head of Engineering",
        text: "How does your ESP32 controller monitor the arc length in real-time to prevent burn-through defects?",
        expectedKeywords: ["voltage", "analog", "feedback", "resistance", "calibration"],
        sampleAnswer: "It measures the voltage drop across the arc using analog-to-digital converter pins and applies calibration curves to determine resistance."
      },
      {
        judge: "Officer Meera Sen",
        avatar: "👩‍✈️",
        role: "Industrial Safety Auditor",
        text: "In the event of a ventilation failure, what redundant safety measures does your system trigger?",
        expectedKeywords: ["solenoid", "valve", "shutoff", "shut down", "isolate"],
        sampleAnswer: "The system triggers a complete power shutdown to the welder and commands the solenoid valve to isolate the gas line instantly."
      }
    ]
  },
  {
    title: "🏥 Voice-Guided Smart CPR Assistant",
    category: "Emergency Healthcare & Lifesaving Tools",
    problem: "Cardiac arrest response delay remains a leading cause of mortality, as bystanders often panic or perform incorrect compressions.",
    solution: "A mobile medical companion providing real-time voice rhythm pacing, automatic 112 emergency routing, and visual step-by-step AED positioning aid.",
    components: ["Piezo Pacing Beeper", "Emergency GSM Shield", "Pressure Sensor Pads", "Audio Speaker Interface"],
    slides: [
      {
        title: "Slide 1: The Critical CPR Gap",
        content: "Every minute of delay in chest compressions reduces survival chance by 10%. Non-professionals frequently fail to push at the recommended rate of 100 to 120 compressions per minute.",
        keywords: ["delay", "survival", "rate", "compressions"],
        hint: "Discuss the survival rate gap (e.g. say 'CPR delay reduces survival rates; correct compressions are critical')"
      },
      {
        title: "Slide 2: Interactive Audio & Pacing Circuit",
        content: "An onboard audio amplifier generates a metronome pulse at exactly 110 BPM. Conductive chest pads measure placement impedance to ensure proper chest recoil is achieved.",
        keywords: ["metronome", "amplifier", "recoil", "pads", "impedance"],
        hint: "Explain the pacing feedback (e.g. say 'Our speaker emits a metronome pacing sound while chest pads measure impedance')"
      },
      {
        title: "Slide 3: Automated Dispatch & Support",
        content: "Simultaneously, a SIM800L module initiates calls to emergency backup units and broadcasts coordinates derived from integrated GPS modules.",
        keywords: ["sim800l", "gps", "coordinates", "emergency", "dispatch"],
        hint: "Describe emergency dispatch (e.g. say 'The SIM800L module sends GPS location coordinates to the nearest emergency dispatch')"
      }
    ],
    questions: [
      {
        judge: "Dr. Ananya Roy",
        avatar: "👩‍⚕️",
        role: "Chief Emergency Medicine Officer",
        text: "How does your pressure pad verify that the operator is letting the chest recoil completely between compressions?",
        expectedKeywords: ["recoil", "release", "pressure", "force", "impedance"],
        sampleAnswer: "The pressure sensors calibrate to zero force on release, confirming total chest recoil before registering the next compression stroke."
      },
      {
        judge: "Rajesh Kumar",
        avatar: "👨‍💻",
        role: "Healthcare Tech Investor",
        text: "What makes this device more practical than a standard smartphone app during a high-stress emergency?",
        expectedKeywords: ["hardware", "offline", "speaker", "metronome", "robust"],
        sampleAnswer: "It relies on dedicated robust offline hardware that doesn't need internet access, features a high-volume beeper, and works hands-free."
      }
    ]
  }
];

interface ProjectExpoProps {
  user: any;
  onBack: () => void;
}

export const ProjectExpo: React.FC<ProjectExpoProps> = ({ user: _user, onBack }) => {
  const [selectedProjIdx, setSelectedProjIdx] = useState<number | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [mode, setMode] = useState<'selection' | 'presentation' | 'qna' | 'grading'>('selection');
  
  // Presentation Stats
  const [slideNavScore, setSlideNavScore] = useState(0);
  const [pitchScore, setPitchScore] = useState(0);
  const [qnaScore, setQnaScore] = useState(0);
  const [recognizedKeywords, setRecognizedKeywords] = useState<string[]>([]);
  
  // Q&A State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [expoStartTime, setExpoStartTime] = useState(0);
  
  // Dialect
  const [language, setLanguage] = useState<'en-US' | 'hi-IN' | 'ta-IN'>('en-US');
  const narratorSpeed = 1.0;
  const [isNarratorActive, setIsNarratorActive] = useState<boolean>(true);
  const [voiceSynthesizer, setVoiceSynthesizer] = useState<SpeechSynthesis | null>(null);

  const { showToast } = useNotification();
  const currentProject = selectedProjIdx !== null ? PROJECTS_DATA[selectedProjIdx] : null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceSynthesizer(window.speechSynthesis);
    }
  }, []);

  const speakText = (text: string) => {
    if (!isNarratorActive || !voiceSynthesizer) return;
    voiceSynthesizer.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = narratorSpeed;
    voiceSynthesizer.speak(utterance);
  };

  const selectProject = (idx: number) => {
    setSelectedProjIdx(idx);
    setCurrentSlideIdx(0);
    setSlideNavScore(100);
    setPitchScore(0);
    setQnaScore(0);
    setRecognizedKeywords([]);
    setMode('presentation');
    setExpoStartTime(performance.now());
    
    speakText(`Entering Project Presentation Arena for ${PROJECTS_DATA[idx].title}. Please pitch slide one.`);
  };

  const handleVoiceCommand = (_cmd: string, rawText: string) => {
    if (mode === 'presentation' && currentProject) {
      setLiveTranscript(rawText);
      const textLower = rawText.toLowerCase();

      // Slide Navigation commands
      if (textLower.includes("next slide") || textLower.includes("अगला") || textLower.includes("அடுத்து")) {
        if (currentSlideIdx < currentProject.slides.length - 1) {
          setCurrentSlideIdx(prev => prev + 1);
          setLiveTranscript('');
          speakText(`Slide ${currentSlideIdx + 2}`);
          setSlideNavScore(prev => prev + 20);
          showToast("Command: Next Slide executed.", "success");
        } else {
          showToast("You are on the final slide. Say 'Finish Presentation' to start Q&A.", "info");
          speakText("You are on the last slide. You can say finish presentation.");
        }
        return;
      }

      if (textLower.includes("previous slide") || textLower.includes("पिछला") || textLower.includes("முந்தைய")) {
        if (currentSlideIdx > 0) {
          setCurrentSlideIdx(prev => prev - 1);
          setLiveTranscript('');
          speakText(`Slide ${currentSlideIdx}`);
          showToast("Command: Previous Slide executed.", "success");
        }
        return;
      }

      if (textLower.includes("finish presentation") || textLower.includes("समाप्त") || textLower.includes("முடிவு")) {
        startQnAMode();
        return;
      }

      // Context pitching checking (Keyword recognition)
      const currentSlide = currentProject.slides[currentSlideIdx];
      let matches: string[] = [];
      currentSlide.keywords.forEach(kw => {
        if (textLower.includes(kw) && !recognizedKeywords.includes(kw)) {
          matches.push(kw);
        }
      });

      if (matches.length > 0) {
        setRecognizedKeywords(prev => [...prev, ...matches]);
        setPitchScore(prev => prev + matches.length * 15);
        showToast(`Matched pitch concepts: ${matches.join(', ')}`, "success");
        speakText(`Excellent concept pitch.`);
      }
    } else if (mode === 'qna' && currentProject) {
      setLiveTranscript(rawText);
    }
  };

  const startQnAMode = () => {
    setMode('qna');
    setCurrentQuestionIdx(0);
    setLiveTranscript('');
    
    if (currentProject) {
      speakText(`Presentation concluded. Commencing AI Judge defense. Question 1 from ${currentProject.questions[0].judge}: ${currentProject.questions[0].text}`);
    }
  };

  const handleSpeechResult = (text: string, isFinal: boolean) => {
    if (!isFinal) {
      setLiveTranscript(text);
      return;
    }

    if (mode === 'presentation') {
      handleVoiceCommand('', text);
    } else if (mode === 'qna' && currentProject) {
      const currentQuestion = currentProject.questions[currentQuestionIdx];
      const answerLower = text.toLowerCase();

      // Analyze answer matching keywords
      let matches = 0;
      currentQuestion.expectedKeywords.forEach(kw => {
        if (answerLower.includes(kw)) {
          matches++;
        }
      });

      const latency = Math.round(performance.now() - expoStartTime);
      const points = Math.max(50, 100 - Math.floor(latency / 1000)) + (matches * 15);
      setQnaScore(prev => prev + points);

      if (matches >= 2) {
        showToast(`Q&A defense correct! Matched ${matches} technical concepts.`, 'success');
        speakText("Answer accepted.");
      } else {
        showToast(`Weak response. Try using more technical terms like: ${currentQuestion.expectedKeywords.join(', ')}`, 'info');
        speakText("Answer evaluated with low technical index.");
      }

      // Progress or Grading
      if (currentQuestionIdx < currentProject.questions.length - 1) {
        setCurrentQuestionIdx(prev => prev + 1);
        setLiveTranscript('');
        setExpoStartTime(performance.now());
        setTimeout(() => {
          speakText(`Question ${currentQuestionIdx + 2} from ${currentProject.questions[currentQuestionIdx + 1].judge}: ${currentProject.questions[currentQuestionIdx + 1].text}`);
        }, 1500);
      } else {
        setTimeout(() => {
          triggerGrading();
        }, 1500);
      }
    }
  };

  const triggerGrading = async () => {
    setMode('grading');
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.6 }
    });

    const averageAccuracy = Math.min(100, Math.round(((pitchScore + qnaScore) / 400) * 100));
    const finalScore = slideNavScore + pitchScore + qnaScore;

    speakText(`Project Expo completed. Your final pitch rank is outstanding. Overall grade: ${averageAccuracy} percent.`);

    try {
      await api.post('/games/scores', {
        gameType: 'pronunciation', // logging as project pitch communication
        score: finalScore,
        difficulty: 'advanced',
        accuracy: averageAccuracy
      });
      
      await api.post('/games/voice-logs', {
        command: `expo_${currentProject?.title.substring(2).replace(/\s+/g, '_').toLowerCase()}_complete`,
        textRecognized: `Expo score: ${finalScore}. Pitch accuracy: ${averageAccuracy}%`,
        status: 'success'
      });
    } catch (err) {
      console.error("Score persist failed:", err);
    }
  };

  const resetExpo = () => {
    setMode('selection');
    setSelectedProjIdx(null);
    setCurrentSlideIdx(0);
    setLiveTranscript('');
  };

  return (
    <div style={{ maxWidth: '850px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* HEADER UTILS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={mode === 'selection' ? onBack : resetExpo} 
          className="btn btn-glass"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <ChevronLeft size={16} />
          <span>{mode === 'selection' ? "Exit Project Expo" : "Back to Selection"}</span>
        </button>

        {/* Global Multi-lingual Switch panel */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-subtle)' }}>PRESENTATION LANGUAGE:</span>
          <select 
            value={language} 
            onChange={(e) => {
              const lang = e.target.value as any;
              setLanguage(lang);
              speakText(`Expo language set.`);
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

      {/* MODE 1: PROJECT SELECTION SECTOR */}
      {mode === 'selection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 className="gradient-title" style={{ fontSize: '32px', fontWeight: 800 }}>
              🎓 Mini Project Expo
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Showcase your vocational prototypes, explain schematics, and defend your work against simulated AI Judge panels using real-time voice controls.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {PROJECTS_DATA.map((proj, idx) => (
              <GlassCard 
                key={idx} 
                className="glass-panel" 
                glow={true} 
                style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', cursor: 'pointer', borderTop: '4px solid var(--color-primary)' }}
                onClick={() => selectProject(idx)}
              >
                <div>
                  <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '50px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {proj.category}
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: '12px', fontFamily: 'var(--font-heading)' }}>
                    {proj.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                    {proj.problem}
                  </p>
                  
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-subtle)' }}>KEY HARDWARE SCHEMATIC:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {proj.components.map((c, i) => (
                        <span key={i} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', padding: '2px 8px', borderRadius: '4px' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ padding: '10px 16px', width: '100%', gap: '8px' }}>
                  <Presentation size={16} />
                  <span>Start Showcase & Pitch</span>
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* MODE 2: PRESENTATION SLIDE SHOWCASE */}
      {mode === 'presentation' && currentProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Active Presentation Deck
              </span>
              <h3 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                {currentProject.title}
              </h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Slide Navigation:</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {currentSlideIdx + 1} / {currentProject.slides.length}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
            
            {/* Interactive Slide Canvas */}
            <GlassCard className="glass-panel" style={{ padding: '36px', minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
              
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 'bold' }}>SLIDE DECK DISPLAY</span>
                <h4 style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>
                  {currentProject.slides[currentSlideIdx].title}
                </h4>
                <p style={{ fontSize: '15px', color: 'var(--text-main)', marginTop: '20px', lineHeight: 1.6 }}>
                  {currentProject.slides[currentSlideIdx].content}
                </p>
              </div>

              {/* Bottom slide controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                  💡 Voice Commands: Say **"Next Slide"**, **"Previous Slide"**, or **"Finish Presentation"**
                </span>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-glass" 
                    style={{ padding: '6px' }}
                    onClick={() => {
                      if (currentSlideIdx > 0) setCurrentSlideIdx(prev => prev - 1);
                    }}
                    disabled={currentSlideIdx === 0}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    className="btn btn-glass" 
                    style={{ padding: '6px' }}
                    onClick={() => {
                      if (currentSlideIdx < currentProject.slides.length - 1) setCurrentSlideIdx(prev => prev + 1);
                    }}
                    disabled={currentSlideIdx === currentProject.slides.length - 1}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Pitch guide panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <GlassCard className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-accent)' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Pitching Assistant Hint
                </span>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                  {currentProject.slides[currentSlideIdx].hint}
                </p>
              </GlassCard>

              {/* Concepts/Keywords checked checklist */}
              <GlassCard className="glass-panel" style={{ padding: '24px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Required Technical Vocabulary
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {currentProject.slides[currentSlideIdx].keywords.map((kw, i) => {
                    const isChecked = recognizedKeywords.includes(kw);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <div style={{ 
                          width: '14px', 
                          height: '14px', 
                          borderRadius: '4px', 
                          border: '1.5px solid var(--border-glass)',
                          background: isChecked ? 'var(--color-accent)' : 'transparent',
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

          {/* Voice Command feedback display */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <MicVisualizer 
              onTranscript={handleSpeechResult}
              placeholderText="Tap microphone and present slide deck out loud..."
            />
            {liveTranscript && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)', marginRight: '6px' }}>Presenter Vocals:</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>"{liveTranscript}"</span>
              </div>
            )}
          </GlassCard>

          {/* Accessibility panel */}
          <GlassCard className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn btn-glass" 
                style={{ padding: '6px' }}
                onClick={() => setIsNarratorActive(prev => !prev)}
              >
                {isNarratorActive ? <Volume2 size={16} style={{ color: 'var(--color-primary)' }} /> : <VolumeX size={16} />}
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vocal Slide Narrator</span>
            </div>
            
            <button className="btn btn-accent" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={startQnAMode}>
              <span>Skip Pitch & Defend Q&A</span>
            </button>
          </GlassCard>
        </div>
      )}

      {/* MODE 3: Q&A INTERACTIVE DEFENSE */}
      {mode === 'qna' && currentProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                AI Judge Defense Session
              </span>
              <h3 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                Q&A Panel Defense
              </h3>
            </div>
            
            <span style={{ fontSize: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 12px', borderRadius: '50px', fontWeight: 'bold' }}>
              Question {currentQuestionIdx + 1} of {currentProject.questions.length}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
            
            {/* Active Judge Profile */}
            <GlassCard className="glass-panel" style={{ padding: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '56px', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.1))' }}>
                {currentProject.questions[currentQuestionIdx].avatar}
              </span>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                  {currentProject.questions[currentQuestionIdx].judge}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>
                  {currentProject.questions[currentQuestionIdx].role}
                </p>
              </div>
              <div style={{ width: '100%', height: '1px', background: 'var(--border-glass)', margin: '8px 0' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "Present a complete detailed technical breakdown to satisfy query benchmarks."
              </p>
            </GlassCard>

            {/* The Question Prompt */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <GlassCard className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid var(--color-primary)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Spoken Question
                </span>
                <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginTop: '8px', lineHeight: 1.5 }}>
                  "{currentProject.questions[currentQuestionIdx].text}"
                </p>
              </GlassCard>

              {/* Technical expectations */}
              <GlassCard className="glass-panel" style={{ padding: '24px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Expected Technical Key concepts
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                  {currentProject.questions[currentQuestionIdx].expectedKeywords.map((kw, i) => (
                    <span key={i} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', padding: '4px 10px', borderRadius: '6px' }}>
                      "{kw}"
                    </span>
                  ))}
                </div>
                <div style={{ width: '100%', height: '1px', background: 'var(--border-glass)', margin: '14px 0' }} />
                <span style={{ fontSize: '10px', color: 'var(--color-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  💡 Answer Tip
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  For optimal grading, speak clearly and try using key terms like **"{currentProject.questions[currentQuestionIdx].expectedKeywords[0]}"** or **"{currentProject.questions[currentQuestionIdx].expectedKeywords[1]}"**.
                </p>
              </GlassCard>

            </div>

          </div>

          {/* Voice Input capture */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <MicVisualizer 
              onTranscript={handleSpeechResult}
              placeholderText="Tap microphone and defend your prototype design verbally..."
            />
            {liveTranscript && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)', marginRight: '6px' }}>Defense Speech:</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)' }}>"{liveTranscript}"</span>
              </div>
            )}
          </GlassCard>

        </div>
      )}

      {/* MODE 4: EXPO GRADING & CERTIFICATION SCOREBOARD */}
      {mode === 'grading' && currentProject && (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Award size={48} className="float-animation" />
          </div>

          <div>
            <h3 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)' }} className="gradient-title">
              Project Expo Certified!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Your pitch deck delivery and live technical panel defense for the <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{currentProject.title}</span> has been graded.
            </p>
          </div>

          {/* Score analytics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', maxWidth: '640px', width: '100%', margin: '0 auto' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Deck Nav</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '4px' }}>{slideNavScore} pts</h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Pitch Delivery</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-secondary)', marginTop: '4px' }}>{pitchScore} pts</h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Q&A Defense</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-accent)', marginTop: '4px' }}>{qnaScore} pts</h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Overall Rank</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-success)', marginTop: '4px' }}>
                {Math.min(100, Math.round(((pitchScore + qnaScore) / 400) * 100))}%
              </h4>
            </div>
          </div>

          {/* Certificate display card */}
          <GlassCard style={{ border: '2px dashed var(--color-success)', padding: '24px', background: 'rgba(16,185,129,0.02)', maxWidth: '480px', margin: '12px auto 0', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              EXPO INNOVATION EXCELLENCE BADGE
            </span>
            <h5 style={{ fontSize: '20px', marginTop: '10px', fontFamily: 'var(--font-heading)', fontWeight: 'bold' }}>
              VERIFIED PITCH RECORD
            </h5>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Technological Competency Index successfully mapped into real-world employability parameters. Verification hash: {Math.random().toString(36).substring(2, 12).toUpperCase()}
            </p>
          </GlassCard>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={resetExpo}>
              Pitch Another Project
            </button>
            <button className="btn btn-glass" style={{ padding: '10px 24px' }} onClick={onBack}>
              Return to Dashboard
            </button>
          </div>
        </GlassCard>
      )}

    </div>
  );
};
export default ProjectExpo;
