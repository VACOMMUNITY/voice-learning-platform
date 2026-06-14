import React, { useState } from 'react';
import { api } from '../services/api';
import { audio } from '../services/audio';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { MicVisualizer } from '../components/MicVisualizer';
import { ArrowLeft, RefreshCw, Trophy, Heart, Volume2, Sparkles, Brain, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MemoryGameProps {
  onBack: () => void;
  user: any;
}

const WORD_POOL = [
  'Apple', 'Banana', 'Orange', 'Grape', 'Mango', 'Cherry', 'Lemon', 'Peach', 'Plum', 'Berry',
  'Tiger', 'Lion', 'Zebra', 'Rabbit', 'Monkey', 'Panda', 'Koala', 'Giraffe', 'Elephant', 'Camel',
  'Guitar', 'Piano', 'Violin', 'Drums', 'Flute', 'Trumpet', 'Harp', 'Saxophone', 'Cello', 'Clarinet',
  'Laptop', 'Mobile', 'Tablet', 'Router', 'Screen', 'Server', 'Database', 'Network', 'Software', 'Cloud'
];

export const MemoryGame: React.FC<MemoryGameProps> = ({ onBack }) => {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<string[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'showing' | 'recalling' | 'gameover'>('idle');
  const [flashWord, setFlashWord] = useState<string | null>(null);
  const [spokenText, setSpokenText] = useState('');
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [isReadingAloud, setIsReadingAloud] = useState(false);

  const { showToast } = useNotification();

  // Initialize and generate sequence
  const startNewGame = () => {
    setLevel(1);
    setHearts(3);
    setScore(0);
    setHighestStreak(0);
    setSpokenText('');
    generateSequence(1);
  };

  const generateSequence = (currentLevel: number) => {
    setSpokenText('');
    setGameState('showing');
    
    // Choose N random words from the word pool (N = level + 2)
    const sequenceLength = currentLevel + 2;
    const newSequence: string[] = [];
    
    for (let i = 0; i < sequenceLength; i++) {
      const randWord = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
      newSequence.push(randWord);
    }
    
    setSequence(newSequence);
    flashSequence(newSequence);
  };

  // Flash words one by one on screen
  const flashSequence = async (words: string[]) => {
    for (let i = 0; i < words.length; i++) {
      // 1. Flash word on screen
      setFlashWord(words[i]);
      
      // 2. Play word audio programmatically using Web Speech Synthesis if available
      if ('speechSynthesis' in window) {
        setIsReadingAloud(true);
        const utterance = new SpeechSynthesisUtterance(words[i]);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1400));
      
      // 3. Clear word
      setFlashWord(null);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setIsReadingAloud(false);
    setGameState('recalling');
    showToast('Repeat the sequence now!', 'info');
  };

  const handleSpeechResult = (text: string, isFinal: boolean) => {
    if (!isFinal || gameState !== 'recalling') return;

    setSpokenText(text);
    
    const cleanSpoken = text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const spokenWords = cleanSpoken.split(/\s+/);
    
    const cleanTarget = sequence.map(w => w.toLowerCase());

    // Verify sequential chronological matching
    let isCorrect = true;
    if (spokenWords.length !== cleanTarget.length) {
      isCorrect = false;
    } else {
      for (let i = 0; i < cleanTarget.length; i++) {
        if (!spokenWords[i].includes(cleanTarget[i]) && !cleanTarget[i].includes(spokenWords[i])) {
          isCorrect = false;
          break;
        }
      }
    }

    if (isCorrect) {
      // Correct! Level up!
      audio.playCorrect();
      const pointsEarned = level * 100;
      setScore((prev) => prev + pointsEarned);
      setHighestStreak((prev) => Math.max(prev, level));
      showToast(`Correct! Completed Level ${level}. +${pointsEarned} points`, 'success');

      // Log voice logs
      api.post('/games/voice-logs', {
        command: 'memory_streak_success',
        textRecognized: text,
        status: 'success'
      }).catch(() => {});

      setTimeout(() => {
        setLevel((prev) => prev + 1);
        generateSequence(level + 1);
      }, 2000);
    } else {
      // Mistake! Lose a heart
      audio.playWrong();
      const newHearts = hearts - 1;
      setHearts(newHearts);
      
      api.post('/games/voice-logs', {
        command: 'memory_mistake_fail',
        textRecognized: text,
        status: 'success'
      }).catch(() => {});

      if (newHearts <= 0) {
        handleGameOver();
      } else {
        showToast(`Incorrect sequence! Hearts left: ${newHearts}. Re-flashing sequence...`, 'error');
        setTimeout(() => {
          flashSequence(sequence);
        }, 2200);
      }
    }
  };

  const handleGameOver = async () => {
    setGameState('gameover');
    audio.playGameOver();

    try {
      // Calculate accuracy ratio
      const finalAccuracy = Math.round((highestStreak / (level || 1)) * 100);
      
      await api.post('/games/scores', {
        gameType: 'memory',
        score: score,
        difficulty: level > 4 ? 'advanced' : level > 2 ? 'intermediate' : 'beginner',
        accuracy: Math.min(100, Math.max(20, finalAccuracy))
      });

      showToast('Game over! Score saved to leaderboard.', 'success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      showToast('Error saving score to database.', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '780px', width: '100%', margin: '0 auto' }}>
      
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button className="btn btn-glass" style={{ padding: '8px 16px' }} onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Exit Game</span>
        </button>

        {gameState === 'recalling' && (
          <button 
            className="btn btn-glass" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => flashSequence(sequence)}
            disabled={hearts <= 1}
          >
            <RefreshCw size={14} />
            <span>Replay Sequence</span>
          </button>
        )}
      </div>

      {gameState === 'idle' ? (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '40px', textAlign: 'center' }}>
          <Brain size={64} style={{ color: 'var(--color-primary)', marginBottom: '16px' }} className="float-animation" />
          <h2 className="gradient-title" style={{ fontSize: '32px', marginBottom: '12px', fontWeight: 800 }}>
            Memory Voice Game
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 32px auto' }}>
            Train your vocal sequence recall! Listen closely to the flashed word chains and repeat them back in the exact order.
          </p>

          <button className="btn btn-primary" onClick={startNewGame}>
            <Sparkles size={16} />
            <span>Start Training</span>
          </button>
        </GlassCard>
      ) : gameState === 'gameover' ? (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '40px', textAlign: 'center' }}>
          <Award size={64} style={{ color: 'var(--color-accent)', marginBottom: '16px' }} className="float-animation" />
          <h2 className="gradient-title" style={{ fontSize: '32px', marginBottom: '12px', fontWeight: 800 }}>
            Game Over!
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Your cognitive sequence metrics are captured
          </p>
          {spokenText && (
            <p style={{ fontSize: '13px', color: 'var(--text-subtle)', fontStyle: 'italic', marginBottom: '24px' }}>
              Last vocal attempt: "{spokenText}"
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '16px 24px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Score</p>
              <h3 style={{ fontSize: '28px', color: 'var(--color-secondary)' }}>{score} pts</h3>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '16px 24px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Highest Streak</p>
              <h3 style={{ fontSize: '28px', color: 'var(--color-success)' }}>Level {highestStreak}</h3>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button className="btn btn-primary" onClick={startNewGame}>
              <RefreshCw size={16} />
              <span>Try Again</span>
            </button>
            <button className="btn btn-glass" onClick={onBack}>
              <span>Return to Dashboard</span>
            </button>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Game indicators */}
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
                <Brain size={20} />
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Level Streak</p>
                <h4 style={{ fontSize: '18px', color: 'var(--color-secondary)' }}>Level {level}</h4>
              </div>
            </GlassCard>

            <GlassCard className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[...Array(3)].map((_, i) => (
                  <Heart
                    key={i}
                    size={20}
                    style={{ 
                      color: i < hearts ? 'var(--color-accent)' : 'var(--text-subtle)',
                      fill: i < hearts ? 'var(--color-accent)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Flash display cards */}
          <GlassCard className="glass-panel" style={{ padding: '60px 40px', minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {gameState === 'showing' ? (
              <div style={{ textAlign: 'center' }}>
                {flashWord ? (
                  <h2 className="gradient-title" style={{ fontSize: '48px', fontWeight: 800, transform: 'scale(1.1)', transition: 'transform 0.2s ease-out' }}>
                    {flashWord}
                  </h2>
                ) : (
                  <p style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Get Ready...</p>
                )}
                {isReadingAloud && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', color: 'var(--color-secondary)' }}>
                    <Volume2 size={16} className="float-animation" />
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>READING...</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px' }}>
                  🧠 Your Turn!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                  Say the sequence of {sequence.length} words in order now!
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px' }}>
                  {sequence.map((_, i) => (
                    <span key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--border-glass-active)' }} />
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Recalling Voice Control panel */}
          {gameState === 'recalling' && (
            <GlassCard className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '14px', fontFamily: 'var(--font-heading)', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>
                🎤 SPEAK ALL WORDS SEPARATED BY SPACES IN CHRONOLOGICAL ORDER
              </h4>
              
              <MicVisualizer 
                onTranscript={handleSpeechResult}
                placeholderText='Click to record... speak "Apple Banana" etc.'
              />
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
};
export default MemoryGame;
