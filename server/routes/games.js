import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET QUIZ QUESTIONS
router.get('/questions', authMiddleware, async (req, res) => {
  try {
    const { difficulty, category } = req.query;
    let query = {};
    
    if (difficulty) query.difficulty = difficulty.toLowerCase();
    if (category) query.category = category;

    const questions = await db.QuizQuestions.find(query);
    
    // Fallback: If no questions match, just return all
    if (questions.length === 0) {
      const allQs = await db.QuizQuestions.find({});
      return res.status(200).json(allQs);
    }
    
    res.status(200).json(questions);
  } catch (err) {
    console.error('Fetch questions error:', err);
    res.status(500).json({ error: 'Server error retrieving quiz questions.' });
  }
});

// SUBMIT GAME SCORE
router.post('/scores', authMiddleware, async (req, res) => {
  try {
    const { gameType, score, difficulty, accuracy } = req.body;

    if (!gameType || score === undefined) {
      return res.status(400).json({ error: 'Game type and score are required.' });
    }

    // Save score
    const newScore = await db.Scores.create({
      userId: req.user.id,
      username: req.user.username,
      gameType,
      score: Number(score),
      difficulty: difficulty || 'medium',
      accuracy: Number(accuracy || 100)
    });

    // Generate automatic AI Report / Feedback
    let feedback = '';
    const acc = Number(accuracy || 100);
    
    if (gameType === 'quiz') {
      if (acc >= 90) feedback = 'Sensational analytical capabilities! Your response latency and cognitive recall are excellent.';
      else if (acc >= 70) feedback = 'Strong comprehension skills. Try speaking clearer to minimize transcription errors.';
      else feedback = 'Practice makes perfect. Focus on reading the questions carefully and answering calmly.';
    } else if (gameType === 'pronunciation') {
      if (acc >= 85) feedback = 'Excellent articulation and vocal clarity! Your accent matches standard pronunciations beautifully.';
      else if (acc >= 60) feedback = 'Good pronunciation. Focus on syllable emphasis and speak at a steady, rhythmic pace.';
      else feedback = 'Pronunciation requires attention. Try enunciating each consonant and vowel clearly.';
    } else if (gameType === 'memory') {
      if (acc >= 90) feedback = 'Incredible sequential working memory! You recalled the elements in perfect chronological order.';
      else if (acc >= 60) feedback = 'Good cognitive storage capacity. Try grouping words mentally into categories to boost score.';
      else feedback = 'Vocal recall and memory matching needs improvement. Try repeating the words slowly out loud.';
    }

    // Save accuracy report
    await db.AccuracyReports.create({
      userId: req.user.id,
      gameType,
      accuracyScore: acc,
      feedback
    });

    // Update User Profile Summary in Mongo if in Mongo mode
    if (db.isMongoDB()) {
      const user = await db.Users.findById(req.user.id);
      if (user) {
        const totalScore = (user.totalScore || 0) + Number(score);
        const completedGames = (user.completedGames || 0) + 1;
        await db.Users.findByIdAndUpdate(req.user.id, { totalScore, completedGames });
      }
    }

    res.status(201).json({
      message: 'Score and learning metrics recorded successfully!',
      scoreRecord: newScore,
      aiFeedback: feedback
    });
  } catch (err) {
    console.error('Submit score error:', err);
    res.status(500).json({ error: 'Server error saving game progress.' });
  }
});

// LOG VOICE ACTIVITY
router.post('/voice-logs', authMiddleware, async (req, res) => {
  try {
    const { command, textRecognized, status } = req.body;

    if (!command && !textRecognized) {
      return res.status(400).json({ error: 'Command details required' });
    }

    const log = await db.VoiceActivity.create({
      userId: req.user.id,
      username: req.user.username,
      command: command || 'recognized_speech',
      textRecognized: textRecognized || '',
      status: status || 'success'
    });

    res.status(201).json(log);
  } catch (err) {
    console.error('Voice log error:', err);
    res.status(500).json({ error: 'Server error tracking voice activity.' });
  }
});

// GET PROFILE HISTORY
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const scores = await db.Scores.find({ userId: req.user.id });
    const voiceLogs = await db.VoiceActivity.find({ userId: req.user.id });
    const reports = await db.AccuracyReports.find({ userId: req.user.id });

    // Sort logs descending by timestamp
    const sortedScores = scores.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const sortedVoiceLogs = voiceLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30);
    const sortedReports = reports.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      scores: sortedScores,
      voiceLogs: sortedVoiceLogs,
      accuracyReports: sortedReports
    });
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Server error retrieving learning logs.' });
  }
});

// GET LEADERBOARD
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await db.Scores.getLeaderboard();
    res.status(200).json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error compiling leaderboard.' });
  }
});

// GET AI ADVISOR RECOMMENDATIONS
router.get('/ai-advisor', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const scores = await db.Scores.find({ userId });
    const reports = await db.AccuracyReports.find({ userId });

    if (scores.length === 0) {
      return res.status(200).json({
        strengths: 'Beginning Phase',
        weaknesses: 'Needs baseline play',
        recommendations: ['Embark on your learning journey by launching a game!', 'Start with the Voice Quiz Challenge to establish a cognitive baseline.', 'Try the Pronunciation Trainer at the beginner level to test voice alignment.'],
        motivation: 'Welcome to the Voice Learning Ecosystem! Your potential is unlimited, speak up and command your path!'
      });
    }

    // Group & calculate averages
    const gameMetrics = {
      quiz: { scores: [], accuracy: [], count: 0 },
      pronunciation: { scores: [], accuracy: [], count: 0 },
      memory: { scores: [], accuracy: [], count: 0 }
    };

    scores.forEach(s => {
      if (gameMetrics[s.gameType]) {
        gameMetrics[s.gameType].scores.push(s.score);
        gameMetrics[s.gameType].accuracy.push(s.accuracy || 100);
        gameMetrics[s.gameType].count += 1;
      }
    });

    const getAvg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    
    const quizAvgAcc = getAvg(gameMetrics.quiz.accuracy);
    const pronAvgAcc = getAvg(gameMetrics.pronunciation.accuracy);
    const memoAvgAcc = getAvg(gameMetrics.memory.accuracy);

    // Strengths & Weaknesses heuristics
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];

    // Quiz assessment
    if (gameMetrics.quiz.count > 0) {
      if (quizAvgAcc >= 80) strengths.push('Rapid knowledge recall & conceptual speed');
      else if (quizAvgAcc < 60) weaknesses.push('Conceptual trivia matching');
    } else {
      recommendations.push('Take the Voice Quiz Challenge to test your semantic reasoning.');
    }

    // Pronunciation assessment
    if (gameMetrics.pronunciation.count > 0) {
      if (pronAvgAcc >= 80) strengths.push('Excellent vocal enunciation & audio articulation');
      else if (pronAvgAcc < 60) weaknesses.push('Phonetic word articulation');
    } else {
      recommendations.push('Try the Pronunciation Trainer to calibrate vocal clarity.');
    }

    // Memory assessment
    if (gameMetrics.memory.count > 0) {
      if (memoAvgAcc >= 80) strengths.push('Outstanding sequential verbal memory capacity');
      else if (memoAvgAcc < 60) weaknesses.push('Word sequence audio-verbal recall');
    } else {
      recommendations.push('Engage with the Memory Voice Game to boost sequential recall limits.');
    }

    // Final compile
    if (strengths.length === 0) strengths.push('Adaptability and experimental drive');
    if (weaknesses.length === 0) weaknesses.push('Requires more advanced level entries to reveal performance caps');

    // Recommendation builder based on weaknesses
    if (weaknesses.includes('Conceptual trivia matching')) {
      recommendations.push('Recommend playing beginner levels in Quiz Game to build vocabulary foundation.');
    }
    if (weaknesses.includes('Phonetic word articulation')) {
      recommendations.push('Recommend daily practice on Pronunciation Game intermediate levels with longer syllable counts.');
    }
    if (weaknesses.includes('Word sequence audio-verbal recall')) {
      recommendations.push('Recommend building shorter 3-word chains in Memory Game before pushing to higher levels.');
    }

    // Level suggestions based on averages
    const overallAvgAcc = getAvg([...gameMetrics.quiz.accuracy, ...gameMetrics.pronunciation.accuracy, ...gameMetrics.memory.accuracy]);
    let suggestedDifficulty = 'beginner';
    
    if (overallAvgAcc >= 80) {
      suggestedDifficulty = 'advanced';
      recommendations.push('🔥 Performance indicators are exceptional! Elevate all voice activities to Advanced difficulty.');
    } else if (overallAvgAcc >= 55) {
      suggestedDifficulty = 'intermediate';
      recommendations.push('📈 Solid core foundation established. Progress to Intermediate difficulties to challenge yourself.');
    } else {
      recommendations.push('🐢 Focus on accuracy over speed. Keep settings at Beginner until average hits 70%.');
    }

    // Select motivational message
    let motivation = 'Vocalize your commands clearly, stand tall, and let your intellect shine!';
    if (overallAvgAcc >= 85) motivation = 'Spectacular prowess! Your voice command mastery is standard-setting. Keep expanding boundaries!';
    else if (overallAvgAcc >= 70) motivation = 'Exceptional progression. Every spoken word tunes your neuro-linguistic pathways further!';
    else if (overallAvgAcc >= 50) motivation = 'Terrific effort! Success in speech recognition comes with consistent verbal articulation. Speak confidently!';

    res.status(200).json({
      strengths: strengths.join(' & '),
      weaknesses: weaknesses.join(' & '),
      recommendations: recommendations.slice(0, 4),
      suggestedDifficulty,
      motivation,
      overallAvg: Math.round(overallAvgAcc)
    });
  } catch (err) {
    console.error('AI Advisor error:', err);
    res.status(500).json({ error: 'Server error generating AI learning recommendations.' });
  }
});

export default router;
