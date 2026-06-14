import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { MicVisualizer } from '../components/MicVisualizer';
import { api } from '../services/api';
import { useNotification } from '../components/Notification';
import { 
  Wrench, HeartPulse, Zap, 
  ChevronLeft, Award, Volume2, Flame, VolumeX
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SimulationStep {
  title: string;
  instruction: string;
  expectedKeywords: string[];
  visualHint: string;
  hindiHint: string;
  tamilHint: string;
  hazard?: boolean;
}

const WELDING_STEPS: SimulationStep[] = [
  {
    title: "1. Equip Personal Protective Equipment",
    instruction: "Equip welding goggles, leather apron, and heavy-duty gloves.",
    expectedKeywords: ["goggles", "helmet", "safety glasses", "glove", "apron", "चश्मा", "हेलमेट", "दस्ताने", "கண்ணாடி", "தலைக்கவசம்"],
    visualHint: "Goggles, Apron, Gloves",
    hindiHint: "बोलें: 'Equip goggles' या 'चश्मा पहनो'",
    tamilHint: "கூறுக: 'Equip goggles' அல்லது 'கண்ணாடி அணி'"
  },
  {
    title: "2. Inspect Gas Valves & Pressure",
    instruction: "Check the gas cylinder pressure gauge and adjust the regulator knob.",
    expectedKeywords: ["valve", "regulator", "pressure", "gas gauge", "cylinder", "गैस", "वाल्व", "பிரஷர்", "ரெகுலேட்டர்"],
    visualHint: "Regulator Gauge reading 120 PSI",
    hindiHint: "बोलें: 'Check gas pressure' या 'गैस वाल्व'",
    tamilHint: "கூறுக: 'Check gas pressure' அல்லது 'ரெகுலேட்டர்'"
  },
  {
    title: "3. Choose the Welding Electrode",
    instruction: "Select the correct size electrode (E6010 or E7018) for structural steel welding.",
    expectedKeywords: ["electrode", "rod", "e7018", "e6010", "metal rod", "इलेक्ट्रोड", "मेटल रॉड", "எலக்ட்ரோடு"],
    visualHint: "Electrode Holder & Rod selection",
    hindiHint: "बोलें: 'Pick electrode' या 'रॉड चुनो'",
    tamilHint: "கூறுக: 'Pick electrode' அல்லது 'எலக்ட்ரோடு'"
  },
  {
    title: "4. Strike the Arc & Welder Ignition",
    instruction: "Strike the metal tip with high frequency to ignite the arc flame.",
    expectedKeywords: ["strike", "ignite", "arc", "light", "spark", "flame", "चिंगारी", "आग", "இக்னைட்", "நெருப்பு"],
    visualHint: "Sparking & Molten Pool base",
    hindiHint: "बोलें: 'Strike arc' या 'आग जलाओ'",
    tamilHint: "கூறுக: 'Strike arc' அல்லது 'நெருப்பு மூட்டு'"
  }
];

const CARPENTRY_STEPS: SimulationStep[] = [
  {
    title: "1. Wood Safety Inspection",
    instruction: "Inspect the cedar timber plank for loose knots, warping, or internal rot.",
    expectedKeywords: ["inspect", "wood check", "timber", "check board", "लकड़ी", "लकड़ी चेक", "மரம்", "மரத்தை பரிசோதி"],
    visualHint: "Timber plank under alignment check",
    hindiHint: "बोलें: 'Inspect wood' या 'लकड़ी चेक'",
    tamilHint: "கூறுக: 'Inspect wood' அல்லது 'பரிசோதனை'"
  },
  {
    title: "2. Measure and Mark Cutting Guide",
    instruction: "Align the metal steel square ruler and mark with a carpenter pencil.",
    expectedKeywords: ["measure", "mark", "pencil", "ruler", "scale", "निशान लगाओ", "नाप", "அளவிடு", "பென்சில்"],
    visualHint: "Pencil marking at exactly 24 inches",
    hindiHint: "बोलें: 'Mark board' या 'निशान लगाओ'",
    tamilHint: "கூறுக: 'Mark board' அல்லது 'அளவிடு'"
  },
  {
    title: "3. Secure in Bench Vise",
    instruction: "Place wood in the vise clamps and tighten the spindle wheel.",
    expectedKeywords: ["tighten", "vise", "clamp", "secure board", "शिकंजा", "मजबूत", "வைஸ்", "கிளாம்ப்"],
    visualHint: "Bench vise pressure wheel locking",
    hindiHint: "बोलें: 'Tighten vise' या 'शिकंजा कसें'",
    tamilHint: "கூறுக: 'Tighten vise' அல்லது 'வைஸ் இறுக்கு'"
  },
  {
    title: "4. Select Rip Saw & Begin Cutting",
    instruction: "Pick the 8-teeth-per-inch hand saw and perform safety cut at 45 degrees.",
    expectedKeywords: ["saw", "hand saw", "cut", "begin saw", "आरी", "कटिंग", "வாள்", "வெட்டு"],
    visualHint: "Saw teeth aligning with pencil grid line",
    hindiHint: "बोलें: 'Pick hand saw' या 'आरी उठाओ'",
    tamilHint: "கூறுக: 'Pick hand saw' அல்லது 'வாள் எடு'"
  }
];

const HEALTHCARE_STEPS: SimulationStep[] = [
  {
    title: "1. Scene Safety & Responsiveness Check",
    instruction: "Tap the victim's shoulders gently and shout to check for response.",
    expectedKeywords: ["hello", "awake", "respond", "consciousness", "shoulders", "क्या आप ठीक हैं", "உஷார்", "பிரக்ஞை"],
    visualHint: "Unresponsive patient on ground",
    hindiHint: "बोलें: 'Are you okay' या 'क्या आप ठीक हैं'",
    tamilHint: "கூறுக: 'Are you okay' அல்லது 'நலமா'"
  },
  {
    title: "2. Call for Emergency Backup",
    instruction: "Point to a bystander, dictate to call 112 emergency response immediately.",
    expectedKeywords: ["call", "112", "emergency", "ambulance", "help", "एम्बुलेंस", "मदद", "ஆம்புலன்ஸ்", "உதவி"],
    visualHint: "Emergency dispatch dials open",
    hindiHint: "बोलें: 'Call 112 ambulance' या 'मदद बुलाओ'",
    tamilHint: "கூறுக: 'Call 112 ambulance' அல்லது 'உதவி கூப்பிடு'"
  },
  {
    title: "3. Deliver Chest Compressions",
    instruction: "Lock hands, press hard in center of chest at rate of 100-120/min.",
    expectedKeywords: ["compressions", "cpr", "press chest", "push hard", "पंपिंग", "दबाव", "அமுக்கு", "சிபிஆர்"],
    visualHint: "Chest compression diagram centered",
    hindiHint: "बोलें: 'Perform compressions' या 'दबाव दो'",
    tamilHint: "கூறுக: 'Perform compressions' அல்லது 'அமுக்கு'"
  },
  {
    title: "4. Apply AED Defibrillator Pads",
    instruction: "Open AED unit, stick conductive adhesive pads to bare dry chest.",
    expectedKeywords: ["aed", "defibrillator", "pads", "clear", "electric shock", "झटका", "ஏடிடி", "பேடு"],
    visualHint: "AED pads on right chest and left ribcage",
    hindiHint: "बोलें: 'Apply AED pads' या 'मशीन लगाओ'",
    tamilHint: "கூறுக: 'Apply AED pads' அல்லது 'ஏடிடி மாட்டு'"
  }
];

const ELECTRICAL_STEPS: SimulationStep[] = [
  {
    title: "1. De-energize Main Circuit Breaker",
    instruction: "Switch off the main high voltage breaker lock and apply safety tag.",
    expectedKeywords: ["switch off", "breaker", "turn off", "power down", "safety lock", "बंद करो", "மெயின்", "ஆஃப்"],
    visualHint: "Main Breaker Red Handle at UP (ON)",
    hindiHint: "बोलें: 'Switch off breaker' या 'बिजली बंद करो'",
    tamilHint: "கூறுக: 'Switch off breaker' அல்லது 'மெயின் ஆஃப்'"
  },
  {
    title: "2. Test with Digital Multimeter",
    instruction: "Set dial to AC voltage range and touch test leads to copper terminals.",
    expectedKeywords: ["multimeter", "leads", "voltage check", "test copper", "मीटर", "वोल्टेज", "மீட்டர்", "வோல்டேஜ்"],
    visualHint: "Multimeter display indicating 230V vs 0V",
    hindiHint: "बोलें: 'Test multimeter' या 'वोल्टेज चेक करें'",
    tamilHint: "கூறுக: 'Test multimeter' அல்லது 'வோல்டேஜ் டெஸ்ட்'"
  },
  {
    title: "3. Replace Burned Cartridge Fuse",
    instruction: "Extract the charred 15A fuse with insulated pullers and snap new one in.",
    expectedKeywords: ["fuse", "replace fuse", "new fuse", "cartridge", "फ्यूज", "फ्यूज बदलो", "பியூஸ்", "மாற்று"],
    visualHint: "Blown fuse wire visible inside glass",
    hindiHint: "बोलें: 'Replace fuse' या 'नया फ्यूज लगाओ'",
    tamilHint: "கூறுக: 'Replace fuse' அல்லது 'பியூஸ் மாற்று'"
  },
  {
    title: "4. Re-energize & Load Verification",
    instruction: "Restore breaker handle, check green indicator light for successful diagnostic.",
    expectedKeywords: ["power on", "switch on", "restore", "light green", "चालू", "ஆன்", "பவர்"],
    visualHint: "Breaker switch DOWN (OFF)",
    hindiHint: "बोलें: 'Turn on power' या 'बिजली चालू करो'",
    tamilHint: "கூறுக: 'Turn on power' அல்லது 'பவர் ஆன்'"
  }
];

interface VocationalSimulationProps {
  user: any;
  onBack: () => void;
}

type ModuleType = 'welding' | 'carpentry' | 'healthcare' | 'electrical';

export const VocationalSimulation: React.FC<VocationalSimulationProps> = ({ user: _user, onBack }) => {
  const [selectedModule, setSelectedModule] = useState<ModuleType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [accuracyHistory, setAccuracyHistory] = useState<number[]>([]);
  const [stepStartTime, setStepStartTime] = useState(0);
  const [isSimulationComplete, setIsSimulationComplete] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'hi-IN' | 'ta-IN'>('en-US');
  const [textFeed, setTextFeed] = useState('');
  
  // Custom screen reader config
  const [voiceSynthesizer, setVoiceSynthesizer] = useState<SpeechSynthesis | null>(null);
  const [narratorSpeed, setNarratorSpeed] = useState<number>(1.0);
  const [isNarratorActive, setIsNarratorActive] = useState<boolean>(true);

  const { showToast } = useNotification();

  const activeSteps = selectedModule === 'welding' ? WELDING_STEPS
                    : selectedModule === 'carpentry' ? CARPENTRY_STEPS
                    : selectedModule === 'healthcare' ? HEALTHCARE_STEPS
                    : ELECTRICAL_STEPS;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceSynthesizer(window.speechSynthesis);
    }
  }, []);

  // Text-To-Speech Narration Utility
  const speakText = (text: string) => {
    if (!isNarratorActive || !voiceSynthesizer) return;
    voiceSynthesizer.cancel(); // stop current sound
    
    // Choose correct language dial
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = narratorSpeed;
    
    voiceSynthesizer.speak(utterance);
  };

  const handleModuleSelect = (mod: ModuleType) => {
    setSelectedModule(mod);
    setCurrentStep(0);
    setScore(0);
    setAccuracyHistory([]);
    setIsSimulationComplete(false);
    setStepStartTime(performance.now());
    
    const textPrompt = `Starting ${mod} vocational simulator. Step 1 safety: ${
      mod === 'welding' ? WELDING_STEPS[0].instruction : 
      mod === 'carpentry' ? CARPENTRY_STEPS[0].instruction :
      mod === 'healthcare' ? HEALTHCARE_STEPS[0].instruction : 
      ELECTRICAL_STEPS[0].instruction
    }`;
    setTimeout(() => {
      speakText(textPrompt);
    }, 400);
  };

  const handleSpeechResult = (recognizedText: string, isFinal: boolean) => {
    if (isSimulationComplete) return;
    
    setTextFeed(recognizedText);
    
    if (!isFinal) return; // wait for complete pause

    const step = activeSteps[currentStep];
    const spokenLower = recognizedText.toLowerCase();

    // Check keyword matching percentage
    let matchFound = false;
    for (let word of step.expectedKeywords) {
      if (spokenLower.includes(word.toLowerCase())) {
        matchFound = true;
        break;
      }
    }

    const latency = Math.round(performance.now() - stepStartTime);

    if (matchFound) {
      // High score on match
      const stepAccuracy = Math.max(100 - Math.floor(latency / 200), 50); // Decay score slightly based on speed
      setAccuracyHistory(prev => [...prev, stepAccuracy]);
      setScore(prev => prev + stepAccuracy * 10);
      
      showToast(`Step Correct! Alignment score: ${stepAccuracy}%`, 'success');
      speakText("Correct. Moving to next sequence step.");

      // Advance or complete
      if (currentStep < activeSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
        setStepStartTime(performance.now());
        setTextFeed('');
        
        // Announce next instruction
        setTimeout(() => {
          speakText(activeSteps[currentStep + 1].instruction);
        }, 1200);
      } else {
        // Simulation finished
        handleSimulationEnd();
      }
    } else {
      // Bad speech or incorrect safety tool callout
      showToast("Speech alignment failed. Try articulating safety commands clearly.", "info");
      speakText("Safety check failed. Try again.");
    }
  };

  const handleSimulationEnd = async () => {
    setIsSimulationComplete(true);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    const averageAccuracy = accuracyHistory.length > 0 
      ? Math.round(accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length) 
      : 80;

    const totalCalculatedScore = score;
    speakText(`Congratulations! Simulation complete. You scored ${totalCalculatedScore} points. Dynamic badge awarded.`);

    // Log progress details securely to backend server
    try {
      await api.post('/games/scores', {
        gameType: 'quiz', // logging as vocational quiz
        score: totalCalculatedScore,
        difficulty: 'medium',
        accuracy: averageAccuracy
      });
      
      // Also log voice activity command summary
      await api.post('/games/voice-logs', {
        command: `vocational_${selectedModule}_complete`,
        textRecognized: `Vocal competency level: ${averageAccuracy}% in ${selectedModule}`,
        status: 'success'
      });
      showToast('Vocational performance logged in profile analytics.', 'success');
    } catch (e) {
      console.error("Score persist failed:", e);
    }
  };

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={selectedModule ? () => { setSelectedModule(null); setTextFeed(''); } : onBack} 
          className="btn btn-glass"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <ChevronLeft size={16} />
          <span>{selectedModule ? "Switch Module" : "Exit to Dashboard"}</span>
        </button>

        {/* Global Multi-lingual Switch panel */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-subtle)' }}>NATIVE DIALECT:</span>
          <select 
            value={language} 
            onChange={(e) => {
              const lang = e.target.value as any;
              setLanguage(lang);
              speakText(`Language altered successfully.`);
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

      {/* NO SELECTION MODE */}
      {!selectedModule && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 className="gradient-title" style={{ fontSize: '32px', fontWeight: 800 }}>
              Vocational Voice Simulators
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Practice vocational sequences, equipment audits, and emergency protocols fully controlled by voice.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Welding Card */}
            <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '16px', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleModuleSelect('welding')}>
              <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Flame size={28} className="pulse" />
              </div>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>🔥 Welding Safety & Striking</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  Sequence metal shielding gas, safety visor positioning, E7018 rod selection, and strike molten arc triggers.
                </p>
              </div>
            </GlassCard>

            {/* Carpentry Card */}
            <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '16px', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleModuleSelect('carpentry')}>
              <div style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Wrench size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>🔧 Carpentry Bench Safety</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  Practice alignment inspections, secure cedar beams in industrial bench vises, and voice-command clean cuts.
                </p>
              </div>
            </GlassCard>

            {/* Healthcare CPR Card */}
            <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '16px', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleModuleSelect('healthcare')}>
              <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HeartPulse size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>🏥 Clinical Emergency CPR</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  Time-pressured cardiopulmonary resuscitation logic. Verbalize shoulder shakes, dialing 112, and AED placement.
                </p>
              </div>
            </GlassCard>

            {/* Electrical Troubleshooting Card */}
            <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '16px', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleModuleSelect('electrical')}>
              <div style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--color-secondary)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>⚙️ Electrical Diagnostics</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  Verify high voltage circuit isolation, perform multimeter copper test operations, and safely snap replacements.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ACTIVE SIMULATION PANEL */}
      {selectedModule && !isSimulationComplete && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-secondary)' }}>
              Sequence: Step {currentStep + 1} of {activeSteps.length}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-success)' }}>
              Score: {score} pts
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${((currentStep) / activeSteps.length) * 100}%`, 
                height: '100%', 
                background: 'var(--color-secondary)',
                transition: 'width 0.3s ease'
              }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* Visual Canvas Sandbox */}
            <GlassCard className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', position: 'relative', overflow: 'hidden' }}>
              
              {/* Pulsing Grid Ambient */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', zIndex: 0 }} />

              {/* Module Specific Schematic Rendering */}
              <div style={{ zIndex: 1, textAlign: 'center' }}>
                {selectedModule === 'welding' && (
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px dashed #ef4444' }}>
                    <Flame size={48} style={{ color: '#ef4444', animation: currentStep === 3 ? 'pulse 1s infinite' : 'none' }} />
                  </div>
                )}
                {selectedModule === 'carpentry' && (
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px dashed #f59e0b' }}>
                    <Wrench size={48} style={{ color: '#f59e0b', transform: `rotate(${currentStep * 30}deg)`, transition: 'transform 0.4s' }} />
                  </div>
                )}
                {selectedModule === 'healthcare' && (
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px dashed #10b981' }}>
                    <HeartPulse size={48} style={{ color: '#10b981', animation: currentStep === 2 ? 'pulse 0.6s infinite' : 'none' }} />
                  </div>
                )}
                {selectedModule === 'electrical' && (
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px dashed var(--color-secondary)' }}>
                    <Zap size={48} style={{ color: 'var(--color-secondary)', animation: currentStep === 0 ? 'none' : 'shake 0.5s infinite' }} />
                  </div>
                )}

                <h5 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
                  {activeSteps[currentStep].visualHint}
                </h5>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '6px' }}>
                  Real-time Simulated Schematic Feed
                </p>
              </div>
            </GlassCard>

            {/* Instruction Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <GlassCard className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-secondary)' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
                  Active Instruction
                </span>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '6px', fontFamily: 'var(--font-heading)' }}>
                  {activeSteps[currentStep].title}
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--text-main)', marginTop: '8px', lineHeight: 1.4 }}>
                  {activeSteps[currentStep].instruction}
                </p>
              </GlassCard>

              {/* Language Hints Panel */}
              <GlassCard className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Microphone Speaking Hint
                </span>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)', marginTop: '6px' }}>
                  {language === 'en-US' ? "Say key action words clearly." : 
                   language === 'hi-IN' ? activeSteps[currentStep].hindiHint : 
                   activeSteps[currentStep].tamilHint}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {activeSteps[currentStep].expectedKeywords.slice(0, 4).map((kw, i) => (
                    <span key={i} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-subtle)' }}>
                      "{kw}"
                    </span>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* VOICE INPUT AND MICROPHONE WAVEFORM */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <MicVisualizer 
              onTranscript={handleSpeechResult} 
              placeholderText="Tap Microphone and state your safety alignment or procedure action..."
              lang={language}
            />
            
            {textFeed && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)', marginRight: '6px' }}>Hearing:</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>"{textFeed}"</span>
              </div>
            )}
          </GlassCard>

          {/* ACCESSIBILITY UTILITIES DOCK */}
          <GlassCard className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn btn-glass" 
                style={{ padding: '6px' }}
                onClick={() => setIsNarratorActive(prev => !prev)}
                title="Toggle vocal instructions narration"
              >
                {isNarratorActive ? <Volume2 size={16} style={{ color: 'var(--color-secondary)' }} /> : <VolumeX size={16} />}
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vocal Guidance</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>NARRATOR SPEED:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0.8, 1.0, 1.2].map(speed => (
                  <button 
                    key={speed} 
                    className={`btn btn-glass ${narratorSpeed === speed ? 'btn-primary' : ''}`}
                    style={{ padding: '4px 8px', fontSize: '10px' }}
                    onClick={() => {
                      setNarratorSpeed(speed);
                      speakText(`Narrator speed adjusted.`);
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* COMPLETED SCREEN */}
      {selectedModule && isSimulationComplete && (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Award size={48} className="float-animation" />
          </div>

          <div>
            <h3 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-heading)' }} className="gradient-title">
              Simulation Complete!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              You successfully sequenced the procedural steps for the <span style={{ textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--color-secondary)' }}>{selectedModule}</span> training.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '360px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Session Score</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-secondary)', marginTop: '4px' }}>{score} pts</h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Vocal Accuracy</span>
              <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-success)', marginTop: '4px' }}>
                {accuracyHistory.length > 0 ? Math.round(accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length) : 100}%
              </h4>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={() => handleModuleSelect(selectedModule)}>
              Restart Simulator
            </button>
            <button className="btn btn-glass" style={{ padding: '10px 24px' }} onClick={() => setSelectedModule(null)}>
              Select Other Module
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
export default VocationalSimulation;
