import React, { useState } from 'react';
import { api } from '../services/api';
import { audio } from '../services/audio';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { MicVisualizer } from '../components/MicVisualizer';
import { ArrowLeft, Sparkles, Trophy, Award, BookOpen, Volume2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PronunciationTrainerProps {
  onBack: () => void;
  user: any;
}

interface Exercise {
  text: string;
  points: number;
  hints: string;
}

export const PronunciationTrainer: React.FC<PronunciationTrainerProps> = ({ onBack }) => {
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [spokenText, setSpokenText] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const { showToast } = useNotification();

  // Word pool per level
  const exercises: Record<'beginner' | 'intermediate' | 'advanced', Exercise[]> = {
    beginner: [
      { text: 'Education', points: 50, hints: 'eh-joo-key-shuhn' },
      { text: 'Ecosystem', points: 50, hints: 'ee-koh-sis-tuhm' },
      { text: 'Linguistics', points: 60, hints: 'ling-gwis-tiks' },
      { text: 'Ecosystem', points: 50, hints: 'ee-koh-sys-tem' },
      { text: 'Pronunciation', points: 70, hints: 'pruh-nuhn-see-ey-shuhn' }
    ],
    intermediate: [
      { text: 'Voice controlled gaming', points: 100, hints: 'vois kuhn-trohld gey-ming' },
      { text: 'Enhanced learning skills', points: 100, hints: 'en-hanst lur-ning skilz' },
      { text: 'Artificial intelligence', points: 120, hints: 'ahr-tuh-fish-uhl in-tel-uh-juhns' },
      { text: 'Cognitive memory recall', points: 110, hints: 'kog-ni-tiv mem-uh-ree ree-kawl' }
    ],
    advanced: [
      { text: 'She sells seashells by the seashore', points: 200, hints: 'Tongue Twister: Focus on sibilant "s" and "sh" clarity.' },
      { text: 'Peter Piper picked a peck of pickled peppers', points: 200, hints: 'Tongue Twister: Focus on plosive "p" articulation speed.' },
      { text: 'Programmatic sound synthesizer audio wave', points: 220, hints: 'Technical vocabulary: Clear rhythm and enunciating consonants.' }
    ]
  };

  const activeExercises = exercises[level];
  const currentExercise = activeExercises[exerciseIndex] || activeExercises[0];

  // Levenshtein Similarity calculation
  const calculateSimilarity = (s1: string, s2: string): number => {
    const cleanStr1 = s1.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    const cleanStr2 = s2.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    
    if (cleanStr1 === cleanStr2) return 100;
    if (cleanStr1.length === 0 || cleanStr2.length === 0) return 0;

    const words1 = cleanStr1.split(/\s+/);
    const words2 = cleanStr2.split(/\s+/);

    // Simple word count overlap ratio for phrases, combined with edit distance character matching
    let matchingWords = 0;
    words2.forEach(w => {
      if (words1.includes(w)) {
        matchingWords++;
      }
    });

    const wordOverlapScore = (matchingWords / words2.length) * 100;

    // Direct string character matching
    const track = Array(cleanStr2.length + 1).fill(null).map(() =>
      Array(cleanStr1.length + 1).fill(null)
    );
    for (let i = 0; i <= cleanStr1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= cleanStr2.length; j += 1) track[j][0] = j;
    
    for (let j = 1; j <= cleanStr2.length; j += 1) {
      for (let i = 1; i <= cleanStr1.length; i += 1) {
        const indicator = cleanStr1[i - 1] === cleanStr2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][j - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    const maxLen = Math.max(cleanStr1.length, cleanStr2.length);
    const editDistanceScore = ((maxLen - track[cleanStr2.length][cleanStr1.length]) / maxLen) * 100;

    // Blend metrics dynamically
    const finalAccuracy = Math.round((wordOverlapScore * 0.6) + (editDistanceScore * 0.4));
    return Math.max(0, Math.min(100, finalAccuracy));
  };

  const handleSpeechResult = (text: string, isFinal: boolean) => {
    if (!isFinal) return;

    setSpokenText(text);
    setAttempts((prev) => prev + 1);

    const calculatedAccuracy = calculateSimilarity(text, currentExercise.text);
    setAccuracy(calculatedAccuracy);

    if (calculatedAccuracy >= 75) {
      audio.playCorrect();
      const pointsEarned = Math.round((currentExercise.points * calculatedAccuracy) / 100);
      setScore((prev) => prev + pointsEarned);
      showToast(`Excellent! ${calculatedAccuracy}% accuracy. +${pointsEarned} points`, 'success');
      
      // Seed voice activity logs
      api.post('/games/voice-logs', {
        command: 'pronunciation_excellent',
        textRecognized: text,
        status: 'success'
      }).catch(() => {});
    } else {
      audio.playWrong();
      showToast(`Pronunciation accuracy is ${calculatedAccuracy}%. Let's try again!`, 'error');
      
      api.post('/games/voice-logs', {
        command: 'pronunciation_low',
        textRecognized: text,
        status: 'success'
      }).catch(() => {});
    }
  };

  const handleSpeakWord = () => {
    if ('speechSynthesis' in window) {
      setIsSynthesizing(true);
      const utterance = new SpeechSynthesisUtterance(currentExercise.text);
      utterance.rate = 0.85; // slightly slower for better phonetic learning
      
      utterance.onend = () => setIsSynthesizing(false);
      utterance.onerror = () => setIsSynthesizing(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      showToast('Speech synthesis not supported in this browser.', 'info');
    }
  };

  const handleNextWord = () => {
    setSpokenText('');
    setAccuracy(null);

    if (exerciseIndex + 1 < activeExercises.length) {
      setExerciseIndex((prev) => prev + 1);
    } else {
      handleCompleteGame();
    }
  };

  const handleCompleteGame = async () => {
    setCompleted(true);
    try {
      // Calculate overall accuracy
      const finalAccuracy = accuracy || 80;
      await api.post('/games/scores', {
        gameType: 'pronunciation',
        score: score,
        difficulty: level,
        accuracy: finalAccuracy
      });

      audio.playLevelUp();
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
      showToast('Activity record successfully updated!', 'success');
    } catch (e) {
      showToast('Error syncing score history.', 'error');
    }
  };

  const handleRestart = () => {
    setCompleted(false);
    setExerciseIndex(0);
    setScore(0);
    setSpokenText('');
    setAccuracy(null);
    setAttempts(0);
  };

  // Split words to draw beautiful colored diff panels
  const renderWordDiff = () => {
    if (!spokenText || accuracy === null) return <h3 style={{ fontSize: '32px', fontWeight: 800 }}>{currentExercise.text}</h3>;

    const targetWords = currentExercise.text.split(' ');
    const spokenWords = spokenText.toLowerCase().split(' ');

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
        {targetWords.map((word, idx) => {
          const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
          const isCorrect = spokenWords.some(sw => sw.includes(cleanWord) || cleanWord.includes(sw));
          
          return (
            <span 
              key={idx} 
              className={`diff-word ${isCorrect ? 'correct' : 'incorrect'}`}
              style={{ textShadow: isCorrect ? '0 0 10px rgba(52,211,153,0.2)' : 'none' }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '780px', width: '100%', margin: '0 auto' }}>
      
      {/* Navigation and levels selection */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button className="btn btn-glass" style={{ padding: '8px 16px' }} onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Exit Trainer</span>
        </button>

        {!completed && (
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px' }}>
            {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  setLevel(diff);
                  setExerciseIndex(0);
                  setAccuracy(null);
                  setSpokenText('');
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-heading)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  background: level === diff ? 'var(--color-primary)' : 'transparent',
                  color: level === diff ? 'white' : 'var(--text-muted)'
                }}
              >
                {diff}
              </button>
            ))}
          </div>
        )}
      </div>

      {completed ? (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '40px', textAlign: 'center' }}>
          <Trophy size={64} style={{ color: 'var(--color-secondary)', marginBottom: '16px' }} className="float-animation" />
          <h2 className="gradient-title" style={{ fontSize: '32px', marginBottom: '12px', fontWeight: 800 }}>
            Session Complete!
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Your articulation score has been logged
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '16px 24px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Points Accrued</p>
              <h3 style={{ fontSize: '28px', color: 'var(--color-secondary)' }}>{score} pts</h3>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '16px 24px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Vocal Attempts</p>
              <h3 style={{ fontSize: '28px', color: 'var(--color-primary)' }}>{attempts} times</h3>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '16px 24px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Completed</p>
              <h3 style={{ fontSize: '28px', color: 'var(--color-success)' }}>{activeExercises.length} / {activeExercises.length}</h3>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button className="btn btn-primary" onClick={handleRestart}>
              <RefreshCw size={16} />
              <span>Retry Session</span>
            </button>
            <button className="btn btn-glass" onClick={onBack}>
              <span>Return to Dashboard</span>
            </button>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card stats */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <GlassCard className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', padding: '8px', borderRadius: '8px' }}>
                <Trophy size={20} />
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Accrued Points</p>
                <h4 style={{ fontSize: '18px', color: 'var(--color-primary)' }}>{score} pts</h4>
              </div>
            </GlassCard>

            <GlassCard className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--color-secondary)', padding: '8px', borderRadius: '8px' }}>
                <BookOpen size={20} />
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Exercise</p>
                <h4 style={{ fontSize: '18px' }}>{exerciseIndex + 1} of {activeExercises.length}</h4>
              </div>
            </GlassCard>

            <GlassCard className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(236,72,153,0.1)', color: 'var(--color-accent)', padding: '8px', borderRadius: '8px' }}>
                <Award size={20} />
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Level</p>
                <h4 style={{ fontSize: '18px', textTransform: 'uppercase', color: 'var(--color-accent)' }}>{level}</h4>
              </div>
            </GlassCard>
          </div>

          {/* Pronunciation Target Panel */}
          <GlassCard className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Target Vocal Phrase
            </span>
            
            {/* Display formatted colored word matching outputs */}
            <div style={{ margin: '16px 0' }}>
              {renderWordDiff()}
            </div>

            {/* Pronunciation assistance helper */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '30px', margin: '8px 0 20px 0' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 'bold' }}>PHONETIC HELP:</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>"{currentExercise.hints}"</span>
              
              <button 
                onClick={handleSpeakWord}
                disabled={isSynthesizing}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-secondary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
                title="Listen to correct pronunciation"
              >
                <Volume2 size={16} style={{ animation: isSynthesizing ? 'pulse 1s infinite' : 'none' }} />
              </button>
            </div>

            {/* Accuracy gauge */}
            {accuracy !== null && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '14px', 
                  fontFamily: 'var(--font-heading)', 
                  fontWeight: 'bold', 
                  color: accuracy >= 75 ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {accuracy >= 75 ? '🎯 SUCCESS!' : '⚠️ ACCURACY TOO LOW'} ({accuracy}% Match)
                </span>
                
                <div style={{ width: '220px', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${accuracy}%`, 
                    height: '100%', 
                    background: accuracy >= 75 ? 'var(--color-success)' : 'var(--color-danger)',
                    transition: 'width 0.5s ease-in-out'
                  }} />
                </div>

                {accuracy >= 75 && (
                  <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleNextWord}>
                    <span>Continue</span>
                    <Sparkles size={16} />
                  </button>
                )}
              </div>
            )}
          </GlassCard>

          {/* Web Speech API Controls Interface */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '14px', fontFamily: 'var(--font-heading)', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>
              🎤 HIT MICROPHONE AND CONFIDENTLY READ THE TARGET PHRASE
            </h4>
            
            <MicVisualizer 
              onTranscript={handleSpeechResult}
              placeholderText='Click to record... speak "Education" or target phrase clearly!'
            />
          </GlassCard>
        </div>
      )}
    </div>
  );
};
export default PronunciationTrainer;
