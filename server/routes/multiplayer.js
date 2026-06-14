import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// CREATE MULTIPLAYER ROOM LOBBY
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { gameType } = req.body;
    
    // Generate unique 6-digit alphanumeric room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const lobby = await db.Lobbies.create({
      roomCode,
      gameType: gameType || 'expo',
      player1: {
        id: req.user.id,
        username: req.user.username
      }
    });

    res.status(201).json(lobby);
  } catch (err) {
    console.error('Create lobby error:', err);
    res.status(500).json({ error: 'Server error creating lobby.' });
  }
});

// JOIN MULTIPLAYER ROOM LOBBY
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.body;
    if (!roomCode) {
      return res.status(400).json({ error: 'Room code is required.' });
    }

    const lobby = await db.Lobbies.findOne({ roomCode: roomCode.toUpperCase() });
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found.' });
    }

    if (lobby.player2 && lobby.player2.id !== req.user.id) {
      return res.status(400).json({ error: 'Lobby is already full.' });
    }

    // Update lobby with guest player details
    const updatedLobby = await db.Lobbies.findOneAndUpdate(lobby.roomCode, {
      player2: {
        id: req.user.id,
        username: req.user.username
      },
      status: 'active'
    });

    res.status(200).json(updatedLobby);
  } catch (err) {
    console.error('Join lobby error:', err);
    res.status(500).json({ error: 'Server error joining lobby.' });
  }
});

// GET MULTIPLAYER ROOM STATE
router.get('/room/:roomCode', authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const lobby = await db.Lobbies.findOne({ roomCode: roomCode.toUpperCase() });
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found.' });
    }

    res.status(200).json(lobby);
  } catch (err) {
    console.error('Fetch room error:', err);
    res.status(500).json({ error: 'Server error getting room status.' });
  }
});

// SYNC MULTIPLAYER ROOM STATE
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { roomCode, currentSlideIdx, recognizedKeywords, activeTarget, activeTurn, status, scores } = req.body;
    
    const lobby = await db.Lobbies.findOne({ roomCode: roomCode.toUpperCase() });
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found.' });
    }

    const updates = {};
    if (currentSlideIdx !== undefined) updates.currentSlideIdx = Number(currentSlideIdx);
    if (recognizedKeywords !== undefined) updates.recognizedKeywords = recognizedKeywords;
    if (activeTarget !== undefined) updates.activeTarget = activeTarget;
    if (activeTurn !== undefined) updates.activeTurn = activeTurn;
    if (status !== undefined) updates.status = status;
    if (scores !== undefined) updates.scores = { ...lobby.scores, ...scores };

    const updatedLobby = await db.Lobbies.findOneAndUpdate(lobby.roomCode, updates);
    res.status(200).json(updatedLobby);
  } catch (err) {
    console.error('Sync room error:', err);
    res.status(500).json({ error: 'Server error syncing gameplay state.' });
  }
});

// LEAVE OR DELETE MULTIPLAYER ROOM
router.post('/leave', authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.body;
    const lobby = await db.Lobbies.findOne({ roomCode: roomCode.toUpperCase() });
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found.' });
    }

    if (lobby.player1.id === req.user.id) {
      // Host leaves: Delete entire lobby
      await db.Lobbies.delete(lobby.roomCode);
      return res.status(200).json({ message: 'Lobby closed by host.' });
    } else if (lobby.player2 && lobby.player2.id === req.user.id) {
      // Guest leaves: Remove guest details
      const updatedLobby = await db.Lobbies.findOneAndUpdate(lobby.roomCode, {
        player2: null,
        status: 'waiting'
      });
      return res.status(200).json(updatedLobby);
    }

    res.status(400).json({ error: 'User is not part of this lobby.' });
  } catch (err) {
    console.error('Leave lobby error:', err);
    res.status(500).json({ error: 'Server error leaving lobby.' });
  }
});

export default router;
