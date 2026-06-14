import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { audio } from '../services/audio';
import { useNotification } from '../components/Notification';
import { GlassCard } from '../components/GlassCard';
import { MicVisualizer } from '../components/MicVisualizer';
import { Award, Zap, Timer, ArrowLeft, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoiceQuizProps {
  onBack: () => void;
  user: any;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  category: string;
  difficulty: string;
}

export const VoiceQuiz: React.FC<VoiceQuizProps> = ({ onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(25);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'ended'>('loading');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [totalAttempts, setTotalAttempts] = useState(0);

  const { showToast } = useNotification();
  const timerRef = useRef<number | null>(null);

  // Fetch questions from Express API
  const loadQuestions = async (diff: string) => {
    try {
      setGameState('loading');
      const data = await api.get(`/games/questions?difficulty=${diff}`);
      setQuestions(data.slice(0, 5)); // 5 questions per game
      setCurrentIndex(0);
      setScore(0);
      setCorrectAnswersCount(0);
      setTotalAttempts(0);
      setTimer(25);
      setSelectedAnswer(null);
      setGameState('playing');
    } catch (err: any) {
      showToast(err.message || 'Error loading questions from database.', 'error');
    }
  };

  useEffect(() => {
    loadQuestions(difficulty);
    return () => stopTimer();
  }, [difficulty]);

  // Handle Game Timer loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timer === 0) {
      handleTimeOut();
      return;
    }

    timerRef.current = window.setTimeout(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => stopTimer();
  }, [timer, gameState]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTimeOut = () => {
    audio.playWrong();
    showToast('Time is up!', 'error');
    setSelectedAnswer('');
    
    // Log voice failure log
    api.post('/games/voice-logs', {
      command: 'timeout',
      textRecognized: 'No speech captured inside timer window.',
      status: 'error'
    }).catch(() => {});

    setTimeout(() => {
      goToNextQuestion();
    }, 1500);
  };

  // Check answers
  const checkSpokenAnswer = (spokenText: string) => {
    if (gameState !== 'playing' || selectedAnswer !== null) return;
    
    const currentQ = questions[currentIndex];
    const correctAns = currentQ.correctAnswer.toLowerCase();
    const cleanSpoken = spokenText.toLowerCase().trim();

    // Check if user spoke options literally: e.g. "Option A", "A", "first option", "Option 1"
    let indexMatched = -1;
    if (cleanSpoken === 'a' || cleanSpoken === 'option a' || cleanSpoken.includes('first option')) indexMatched = 0;
    else if (cleanSpoken === 'b' || cleanSpoken === 'option b' || cleanSpoken.includes('second option')) indexMatched = 1;
    else if (cleanSpoken === 'c' || cleanSpoken === 'option c' || cleanSpoken.includes('third option')) indexMatched = 2;
    else if (cleanSpoken === 'd' || cleanSpoken === 'option d' || cleanSpoken.includes('fourth option')) indexMatched = 3;

    let matchedAnswerText = '';
    if (indexMatched !== -1 && currentQ.options[indexMatched]) {
      matchedAnswerText = currentQ.options[indexMatched];
    } else {
      // Direct string matching of options
      for (const opt of currentQ.options) {
        if (cleanSpoken.includes(opt.toLowerCase())) {
          matchedAnswerText = opt;
          break;
        }
      }
    }

    if (matchedAnswerText) {
      stopTimer();
      setSelectedAnswer(matchedAnswerText);
      setTotalAttempts((prev) => prev + 1);

      if (matchedAnswerText.toLowerCase() === correctAns) {
        // Correct
        audio.playCorrect();
        setScore((prev) => prev + 100);
        setCorrectAnswersCount((prev) => prev + 1);
        showToast('Correct! +100 points', 'success');
        
        // Log voice log in backend
        api.post('/games/voice-logs', {
          command: 'answer_correct',
          textRecognized: spokenText,
          status: 'success'
        }).catch(() => {});
      } else {
        // Wrong
        audio.playWrong();
        showToast('Incorrect answer.', 'error');
        
        api.post('/games/voice-logs', {
          command: 'answer_incorrect',
          textRecognized: spokenText,
          status: 'success'
        }).catch(() => {});
      }

      setTimeout(() => {
        goToNextQuestion();
      }, 2000);
    }
  };

  const goToNextQuestion = () => {
    setSelectedAnswer(null);
    setTimer(25);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      endGame();
    }
  };

  // Submit final results to the API database
  const endGame = async () => {
    stopTimer();
    setGameState('ended');
    const accuracy = Math.round((correctAnswersCount / (totalAttempts || 1)) * 100);

    try {
      // Save game score
      await api.post('/games/scores', {
        gameType: 'quiz',
        score: score,
        difficulty: difficulty,
        accuracy: accuracy
      });
      
      if (score >= 400) {
        audio.playLevelUp();
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        audio.playLevelUp();
      }
      
      showToast('Game over! Score recorded.', 'success');
    } catch (err: any) {
      showToast('Failed to record learning metrics.', 'error');
    }
  };

  // Voice Command overrides
  const handleVoiceCommand = (cmd: string, rawText: string) => {
    console.log('Quiz voice command raw text caught:', rawText);
    switch (cmd) {
      case 'exit':
        audio.playGameOver();
        onBack();
        break;
      case 'next':
        if (selectedAnswer === null) {
          stopTimer();
          setSelectedAnswer('');
          showToast('Question skipped by voice command.', 'info');
          setTimeout(() => goToNextQuestion(), 1500);
        }
        break;
      case 'repeat':
        showToast('Repeating question...', 'info');
        // Let's flash a notification repeating it or trigger web TTS
        if ('speechSynthesis' in window) {
          const speakText = new SpeechSynthesisUtterance(questions[currentIndex].question);
          window.speechSynthesis.speak(speakText);
        }
        break;
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

        {/* Difficulty controls */}
        {gameState === 'playing' && (
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px' }}>
            {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-heading)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  background: difficulty === diff ? 'var(--color-primary)' : 'transparent',
                  color: difficulty === diff ? 'white' : 'var(--text-muted)'
                }}
              >
                {diff}
              </button>
            ))}
          </div>
        )}
      </div>

      {gameState === 'loading' ? (
        <GlassCard className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <RefreshCw className="float-animation" size={48} style={{ color: 'var(--color-secondary)', animation: 'spin 2s infinite linear' }} />
          <h3 style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Assembling Quiz Questions...</h3>
        </GlassCard>
      ) : gameState === 'ended' ? (
        <GlassCard className="glass-panel" glow={true} style={{ padding: '40px', textAlign: 'center' }}>
          <Award size={64} style={{ color: 'var(--color-accent)', marginBottom: '16px' }} className="float-animation" />
          <h2 className="gradient-title" style={{ fontSize: '32px', marginBottom: '12px', fontWeight: 800 }}>
            Quiz Completed!
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Performance recorded in learning records
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '16px 24px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Final Score</p>
              <h3 style={{ fontSize: '28px', color: 'var(--color-secondary)' }}>{score} pts</h3>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '16px 24px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Accuracy</p>
              <h3 style={{ fontSize: '28px', color: 'var(--color-success)' }}>
                {Math.round((correctAnswersCount / (totalAttempts || 1)) * 100)}%
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button className="btn btn-primary" onClick={() => loadQuestions(difficulty)}>
              <RefreshCw size={16} />
              <span>Play Again</span>
            </button>
            <button className="btn btn-glass" onClick={onBack}>
              <span>Return to Dashboard</span>
            </button>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Game Stats panel */}
          <div style={{ display: 'flex', gap: '16px' }}>
            
            <GlassCard className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', padding: '8px', borderRadius: '8px' }}>
                <Timer size={20} />
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Time Left</p>
                <h4 style={{ fontSize: '18px', color: timer < 8 ? 'var(--color-danger)' : 'var(--text-main)' }}>{timer} seconds</h4>
              </div>
            </GlassCard>

            <GlassCard className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--color-secondary)', padding: '8px', borderRadius: '8px' }}>
                <Zap size={20} />
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Score</p>
                <h4 style={{ fontSize: '18px', color: 'var(--color-secondary)' }}>{score} pts</h4>
              </div>
            </GlassCard>

            <GlassCard className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(236,72,153,0.1)', color: 'var(--color-accent)', padding: '8px', borderRadius: '8px' }}>
                <Award size={20} />
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 'bold', textTransform: 'uppercase' }}>Progress</p>
                <h4 style={{ fontSize: '18px' }}>{currentIndex + 1} of {questions.length}</h4>
              </div>
            </GlassCard>
          </div>

          {/* Question panel */}
          <GlassCard className="glass-panel" style={{ padding: '36px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              textTransform: 'uppercase', 
              background: 'rgba(6,182,212,0.1)', 
              color: 'var(--color-secondary)',
              padding: '4px 10px', 
              borderRadius: '50px' 
            }}>
              {questions[currentIndex]?.category}
            </span>

            <h3 style={{ fontSize: '22px', marginTop: '16px', marginBottom: '24px', fontWeight: 600 }}>
              {questions[currentIndex]?.question}
            </h3>

            {/* Answer Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {questions[currentIndex]?.options.map((opt, idx) => {
                const labels = ['A', 'B', 'C', 'D'];
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt.toLowerCase() === questions[currentIndex].correctAnswer.toLowerCase();
                
                let borderCol = 'var(--border-glass)';
                let bgCol = 'rgba(255,255,255,0.02)';
                
                if (selectedAnswer !== null) {
                  if (isCorrect) {
                    borderCol = 'rgba(16,185,129,0.5)';
                    bgCol = 'rgba(16,185,129,0.1)';
                  } else if (isSelected) {
                    borderCol = 'rgba(239,68,68,0.5)';
                    bgCol = 'rgba(239,68,68,0.1)';
                  }
                }

                return (
                  <div
                    key={idx}
                    style={{
                      border: `1px solid ${borderCol}`,
                      background: bgCol,
                      padding: '16px 20px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <span style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '8px', 
                      background: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: isSelected ? 'white' : 'var(--text-muted)'
                    }}>
                      {labels[idx]}
                    </span>
                    <span style={{ fontSize: '15px', color: 'var(--text-main)' }}>{opt}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Web Speech API Controls Interface */}
          <GlassCard className="glass-panel" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '14px', fontFamily: 'var(--font-heading)', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>
              🎤 SAY OPTION LETTER, SAY THE ANSWER DIRECTLY, OR SAY COMMAND ("NEXT", "EXIT")
            </h4>
            
            <MicVisualizer 
              onTranscript={checkSpokenAnswer}
              onCommand={handleVoiceCommand}
              placeholderText="Listening for your answer... speak now!"
            />
          </GlassCard>
        </div>
      )}
    </div>
  );
};
export default VoiceQuiz;
