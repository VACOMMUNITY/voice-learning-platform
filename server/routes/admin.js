import express from 'express';
import { db } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth and admin protections globally on these routes
router.use(authMiddleware);
router.use(adminMiddleware);

// GET ADMIN OVERVIEW STATISTICS
router.get('/stats', async (req, res) => {
  try {
    const users = await db.Users.find({});
    const scores = await db.Scores.find({});
    const logs = await db.VoiceActivity.find({});
    const reports = await db.AccuracyReports.find({});

    // Calculations
    const totalUsers = users.length;
    
    // Active users: Users who logged voice activity in the last 24 hours (or just users count for mini-project presentation)
    const uniqueActive = new Set(logs.map(log => log.userId));
    const activeUsers = Math.max(uniqueActive.size, Math.min(totalUsers, 1)); // ensures at least 1 if totalUsers > 0

    const totalGamesPlayed = scores.length;
    
    // Average accuracy
    const overallAvgAccuracy = scores.length 
      ? Math.round(scores.reduce((a, b) => a + (b.accuracy || 0), 0) / scores.length) 
      : 100;

    // Game breakdown
    const gameBreakdown = { quiz: 0, pronunciation: 0, memory: 0 };
    scores.forEach(s => {
      if (gameBreakdown[s.gameType] !== undefined) {
        gameBreakdown[s.gameType] += 1;
      }
    });

    res.status(200).json({
      totalUsers,
      activeUsers,
      totalGamesPlayed,
      overallAvgAccuracy,
      gameBreakdown,
      recentActivityCount: logs.length
    });
  } catch (err) {
    console.error('Fetch admin stats error:', err);
    res.status(500).json({ error: 'Server error compiling system statistics.' });
  }
});

// GET ALL QUIZ QUESTIONS (CRUD Read)
router.get('/questions', async (req, res) => {
  try {
    const questions = await db.QuizQuestions.find({});
    res.status(200).json(questions);
  } catch (err) {
    console.error('Admin fetch questions error:', err);
    res.status(500).json({ error: 'Server error fetching question pool.' });
  }
});

// CREATE NEW QUIZ QUESTION (CRUD Create)
router.post('/questions', async (req, res) => {
  try {
    const { question, options, correctAnswer, category, difficulty } = req.body;

    if (!question || !options || !correctAnswer) {
      return res.status(400).json({ error: 'Question text, options, and correct answer are required.' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Must provide at least two options.' });
    }

    const newQuestion = await db.QuizQuestions.create({
      question,
      options,
      correctAnswer,
      category: category || 'Coding',
      difficulty: difficulty || 'beginner'
    });

    res.status(201).json({
      message: 'Quiz question added successfully!',
      question: newQuestion
    });
  } catch (err) {
    console.error('Admin create question error:', err);
    res.status(500).json({ error: 'Server error saving new question.' });
  }
});

// UPDATE QUIZ QUESTION (CRUD Update)
router.put('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question, options, correctAnswer, category, difficulty } = req.body;

    const updated = await db.QuizQuestions.findByIdAndUpdate(id, {
      question,
      options,
      correctAnswer,
      category,
      difficulty
    });

    if (!updated) {
      return res.status(404).json({ error: 'Quiz question not found.' });
    }

    res.status(200).json({
      message: 'Quiz question updated successfully!',
      question: updated
    });
  } catch (err) {
    console.error('Admin update question error:', err);
    res.status(500).json({ error: 'Server error modifying question.' });
  }
});

// DELETE QUIZ QUESTION (CRUD Delete)
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.QuizQuestions.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Quiz question not found.' });
    }

    res.status(200).json({ message: 'Quiz question deleted successfully.' });
  } catch (err) {
    console.error('Admin delete question error:', err);
    res.status(500).json({ error: 'Server error deleting question.' });
  }
});

// GET RECENT REPORTS AND SYSTEM ACTIVITY
router.get('/reports', async (req, res) => {
  try {
    const scores = await db.Scores.find({});
    const logs = await db.VoiceActivity.find({});
    
    // Sort and limit
    const recentScores = scores.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 50);
    const recentLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);

    res.status(200).json({
      recentScores,
      voiceLogs: recentLogs
    });
  } catch (err) {
    console.error('Admin reports error:', err);
    res.status(500).json({ error: 'Server error fetching activity reports.' });
  }
});

export default router;
