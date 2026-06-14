import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists for JSON fallback
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'db_store.json');

// Default initial database structure
const DEFAULT_DB = {
  users: [],
  scores: [],
  voiceActivity: [],
  quizQuestions: [
    { id: 'q1', question: 'Which keyword is used to declare a constant in JavaScript?', options: ['var', 'let', 'const', 'constant'], correctAnswer: 'const', category: 'Coding', difficulty: 'beginner' },
    { id: 'q2', question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Text Markup Language', 'Hyper Tabular Markup Language', 'None of these'], correctAnswer: 'Hyper Text Markup Language', category: 'Web Development', difficulty: 'beginner' },
    { id: 'q3', question: 'Which CSS property is used to change the background color?', options: ['color', 'background-color', 'bgcolor', 'bg-color'], correctAnswer: 'background-color', category: 'CSS', difficulty: 'beginner' },
    { id: 'q4', question: 'Is JavaScript single-threaded or multi-threaded?', options: ['Single-threaded', 'Multi-threaded', 'Both', 'Neither'], correctAnswer: 'Single-threaded', category: 'Coding', difficulty: 'intermediate' },
    { id: 'q5', question: 'Which company developed React?', options: ['Google', 'Microsoft', 'Meta', 'Amazon'], correctAnswer: 'Meta', category: 'Coding', difficulty: 'beginner' },
    { id: 'q6', question: 'What is the speed of light in vacuum (approximate)?', options: ['300,000 km/s', '150,000 km/s', '450,000 km/s', '1,000,000 km/s'], correctAnswer: '300,000 km/s', category: 'Science', difficulty: 'intermediate' },
    { id: 'q7', question: 'Which HTML5 tag is used to embed audio?', options: ['<sound>', '<voice>', '<audio>', '<music>'], correctAnswer: '<audio>', category: 'Web Development', difficulty: 'beginner' },
    { id: 'q8', question: 'Which algorithm is typically used by git to secure commits?', options: ['MD5', 'SHA-1', 'SHA-256', 'Blowfish'], correctAnswer: 'SHA-1', category: 'Git', difficulty: 'advanced' },
    { id: 'q9', question: 'What does CSS stand for?', options: ['Creative Style Sheets', 'Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style Sheets'], correctAnswer: 'Cascading Style Sheets', category: 'CSS', difficulty: 'beginner' }
  ],
  accuracyReports: [],
  lobbies: []
};

// Initialize JSON database if missing
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
}

// In-Memory Cache representing the active database
let inMemoryDb = null;

function getInMemoryDb() {
  if (!inMemoryDb) {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        inMemoryDb = JSON.parse(data);
      } else {
        inMemoryDb = JSON.parse(JSON.stringify(DEFAULT_DB));
        fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Error reading JSON fallback database:', err);
      inMemoryDb = JSON.parse(JSON.stringify(DEFAULT_DB));
    }
  }
  return inMemoryDb;
}

// Utility to read JSON DB (returns cache instantly!)
function readJsonDb() {
  return getInMemoryDb();
}

// Utility to write JSON DB (updates cache and persists asynchronously!)
function writeJsonDb(data) {
  inMemoryDb = data;
  // Asynchronous background write-to-disk so Express thread is never blocked!
  fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8', (err) => {
    if (err) {
      console.error('Error background-writing to JSON database:', err);
    }
  });
  return true;
}

// Global state for MongoDB status
let isMongoConnected = false;

// Attempt MongoDB Connection
export const connectDB = async (mongoUri) => {
  if (!mongoUri) {
    console.log('⚠️  No MONGODB_URI environment variable provided. Running on Local JSON database fallback.');
    isMongoConnected = false;
    return false;
  }

  try {
    // 5-second timeout for quick connection attempt
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('🚀 Successfully connected to MongoDB Atlas database.');
    isMongoConnected = true;
    
    // Seed default questions if MongoDB quizQuestions collection is empty
    const QuizSchema = new mongoose.Schema({
      question: String,
      options: [String],
      correctAnswer: String,
      category: String,
      difficulty: String
    });
    const QuizModel = mongoose.models.QuizQuestion || mongoose.model('QuizQuestion', QuizSchema);
    const count = await QuizModel.countDocuments();
    if (count === 0) {
      await QuizModel.insertMany(DEFAULT_DB.quizQuestions.map(q => {
        const { id, ...rest } = q;
        return rest;
      }));
      console.log('🌱 Seeded default quiz questions in MongoDB.');
    }
    
    return true;
  } catch (err) {
    console.error('⚠️  Failed to connect to MongoDB Atlas:', err.message);
    console.log('ℹ️  Falling back to Local JSON database. App is fully operational.');
    isMongoConnected = false;
    return false;
  }
};

// Unified Database CRUD Interfaces
export const db = {
  // Check active mode
  isMongoDB: () => isMongoConnected,

  // USERS INTERFACE
  Users: {
    find: async (query = {}) => {
      if (isMongoConnected) {
        return mongoose.connection.db.collection('users').find(query).toArray();
      } else {
        const data = readJsonDb();
        return data.users.filter(u => {
          for (let key in query) {
            if (u[key] !== query[key]) return false;
          }
          return true;
        });
      }
    },
    findOne: async (query) => {
      if (isMongoConnected) {
        return mongoose.connection.db.collection('users').findOne(query);
      } else {
        const data = readJsonDb();
        return data.users.find(u => {
          for (let key in query) {
            if (u[key] !== query[key]) return false;
          }
          return true;
        }) || null;
      }
    },
    findById: async (id) => {
      if (isMongoConnected) {
        try {
          const objectId = new mongoose.Types.ObjectId(id);
          return mongoose.connection.db.collection('users').findOne({ _id: objectId });
        } catch {
          return mongoose.connection.db.collection('users').findOne({ id: id });
        }
      } else {
        const data = readJsonDb();
        return data.users.find(u => u.id === id || u._id === id) || null;
      }
    },
    create: async (user) => {
      const newUser = {
        id: Math.random().toString(36).substring(2, 9),
        _id: Math.random().toString(36).substring(2, 9),
        username: user.username,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        role: user.role || 'student',
        totalScore: 0,
        completedGames: 0,
        createdAt: new Date().toISOString()
      };

      if (isMongoConnected) {
        const res = await mongoose.connection.db.collection('users').insertOne(newUser);
        return { ...newUser, _id: res.insertedId };
      } else {
        const data = readJsonDb();
        data.users.push(newUser);
        writeJsonDb(data);
        return newUser;
      }
    },
    findByIdAndUpdate: async (id, updates) => {
      if (isMongoConnected) {
        let query = { id: id };
        try {
          const objectId = new mongoose.Types.ObjectId(id);
          query = { $or: [{ _id: objectId }, { id: id }] };
        } catch {}
        
        await mongoose.connection.db.collection('users').updateOne(query, { $set: updates });
        return { id, ...updates };
      } else {
        const data = readJsonDb();
        const index = data.users.findIndex(u => u.id === id || u._id === id);
        if (index !== -1) {
          data.users[index] = { ...data.users[index], ...updates };
          writeJsonDb(data);
          return data.users[index];
        }
        return null;
      }
    }
  },

  // SCORES INTERFACE
  Scores: {
    find: async (query = {}) => {
      if (isMongoConnected) {
        return mongoose.connection.db.collection('scores').find(query).toArray();
      } else {
        const data = readJsonDb();
        return data.scores.filter(s => {
          for (let key in query) {
            if (s[key] !== query[key]) return false;
          }
          return true;
        });
      }
    },
    create: async (scoreData) => {
      const newScore = {
        id: Math.random().toString(36).substring(2, 9),
        _id: Math.random().toString(36).substring(2, 9),
        userId: scoreData.userId,
        username: scoreData.username,
        gameType: scoreData.gameType, // quiz | pronunciation | memory
        score: Number(scoreData.score),
        difficulty: scoreData.difficulty,
        accuracy: Number(scoreData.accuracy || 0),
        completedAt: new Date().toISOString()
      };

      if (isMongoConnected) {
        const res = await mongoose.connection.db.collection('scores').insertOne(newScore);
        return { ...newScore, _id: res.insertedId };
      } else {
        const data = readJsonDb();
        data.scores.push(newScore);
        
        // Also update User profile summary totals
        const userIndex = data.users.findIndex(u => u.id === scoreData.userId || u._id === scoreData.userId);
        if (userIndex !== -1) {
          data.users[userIndex].totalScore = (data.users[userIndex].totalScore || 0) + Number(scoreData.score);
          data.users[userIndex].completedGames = (data.users[userIndex].completedGames || 0) + 1;
        }

        writeJsonDb(data);
        
        // Also update Mongo if active
        return newScore;
      }
    },
    getLeaderboard: async () => {
      if (isMongoConnected) {
        return mongoose.connection.db.collection('scores')
          .aggregate([
            { $group: { _id: '$userId', username: { $first: '$username' }, totalScore: { $sum: '$score' }, gamesCount: { $sum: 1 }, maxAccuracy: { $max: '$accuracy' } } },
            { $sort: { totalScore: -1 } },
            { $limit: 10 }
          ]).toArray();
      } else {
        const data = readJsonDb();
        // Aggregate totals per user
        const totals = {};
        data.scores.forEach(s => {
          if (!totals[s.userId]) {
            totals[s.userId] = {
              userId: s.userId,
              username: s.username,
              totalScore: 0,
              gamesCount: 0,
              maxAccuracy: 0
            };
          }
          totals[s.userId].totalScore += s.score;
          totals[s.userId].gamesCount += 1;
          totals[s.userId].maxAccuracy = Math.max(totals[s.userId].maxAccuracy, s.accuracy);
        });

        return Object.values(totals)
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 10);
      }
    }
  },

  // VOICE ACTIVITY LOG INTERFACE
  VoiceActivity: {
    find: async (query = {}) => {
      if (isMongoConnected) {
        return mongoose.connection.db.collection('voice_activity').find(query).toArray();
      } else {
        const data = readJsonDb();
        return data.voiceActivity.filter(v => {
          for (let key in query) {
            if (v[key] !== query[key]) return false;
          }
          return true;
        });
      }
    },
    create: async (activity) => {
      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        userId: activity.userId,
        username: activity.username,
        command: activity.command, // jump, start, paris, etc.
        textRecognized: activity.textRecognized,
        status: activity.status || 'success', // success | error
        timestamp: new Date().toISOString()
      };

      if (isMongoConnected) {
        await mongoose.connection.db.collection('voice_activity').insertOne(newLog);
      } else {
        const data = readJsonDb();
        data.voiceActivity.push(newLog);
        // Cap voice activity history at 500 records
        if (data.voiceActivity.length > 500) {
          data.voiceActivity.shift();
        }
        writeJsonDb(data);
      }
      return newLog;
    }
  },

  // QUIZ QUESTIONS CRUD INTERFACE
  QuizQuestions: {
    find: async (query = {}) => {
      if (isMongoConnected) {
        return mongoose.connection.db.collection('quiz_questions').find(query).toArray();
      } else {
        const data = readJsonDb();
        return data.quizQuestions.filter(q => {
          for (let key in query) {
            if (q[key] !== query[key]) return false;
          }
          return true;
        });
      }
    },
    create: async (questionData) => {
      const newQuestion = {
        id: Math.random().toString(36).substring(2, 9),
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        category: questionData.category || 'General',
        difficulty: questionData.difficulty || 'beginner'
      };

      if (isMongoConnected) {
        await mongoose.connection.db.collection('quiz_questions').insertOne(newQuestion);
      } else {
        const data = readJsonDb();
        data.quizQuestions.push(newQuestion);
        writeJsonDb(data);
      }
      return newQuestion;
    },
    findByIdAndUpdate: async (id, updates) => {
      if (isMongoConnected) {
        await mongoose.connection.db.collection('quiz_questions').updateOne({ id: id }, { $set: updates });
        return { id, ...updates };
      } else {
        const data = readJsonDb();
        const index = data.quizQuestions.findIndex(q => q.id === id);
        if (index !== -1) {
          data.quizQuestions[index] = { ...data.quizQuestions[index], ...updates };
          writeJsonDb(data);
          return data.quizQuestions[index];
        }
        return null;
      }
    },
    findByIdAndDelete: async (id) => {
      if (isMongoConnected) {
        const res = await mongoose.connection.db.collection('quiz_questions').deleteOne({ id: id });
        return res.deletedCount > 0;
      } else {
        const data = readJsonDb();
        const index = data.quizQuestions.findIndex(q => q.id === id);
        if (index !== -1) {
          data.quizQuestions.splice(index, 1);
          writeJsonDb(data);
          return true;
        }
        return false;
      }
    }
  },

  // ACCURACY REPORTS INTERFACE
  AccuracyReports: {
    find: async (query = {}) => {
      if (isMongoConnected) {
        return mongoose.connection.db.collection('accuracy_reports').find(query).toArray();
      } else {
        const data = readJsonDb();
        return data.accuracyReports.filter(r => {
          for (let key in query) {
            if (r[key] !== query[key]) return false;
          }
          return true;
        });
      }
    },
    create: async (reportData) => {
      const newReport = {
        id: Math.random().toString(36).substring(2, 9),
        userId: reportData.userId,
        gameType: reportData.gameType,
        accuracyScore: Number(reportData.accuracyScore),
        feedback: reportData.feedback || 'Good effort!',
        date: new Date().toISOString()
      };

      if (isMongoConnected) {
        await mongoose.connection.db.collection('accuracy_reports').insertOne(newReport);
      } else {
        const data = readJsonDb();
        data.accuracyReports.push(newReport);
        writeJsonDb(data);
      }
      return newReport;
    }
  },

  // LOBBIES MULTIPLAYER INTERFACE
  Lobbies: {
    find: async (query = {}) => {
      const data = readJsonDb();
      if (!data.lobbies) data.lobbies = [];
      return data.lobbies.filter(l => {
        for (let key in query) {
          if (l[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findOne: async (query) => {
      const data = readJsonDb();
      if (!data.lobbies) data.lobbies = [];
      return data.lobbies.find(l => {
        for (let key in query) {
          if (l[key] !== query[key]) return false;
        }
        return true;
      }) || null;
    },
    create: async (lobbyData) => {
      const data = readJsonDb();
      if (!data.lobbies) data.lobbies = [];
      const newLobby = {
        id: Math.random().toString(36).substring(2, 9),
        roomCode: lobbyData.roomCode,
        gameType: lobbyData.gameType || 'expo', // expo | tactical
        player1: lobbyData.player1, // host details { id, username }
        player2: null, // guest details
        status: 'waiting', // waiting | active | complete
        activeTurn: lobbyData.player1.id,
        currentSlideIdx: 0,
        recognizedKeywords: [],
        activeTarget: null,
        scores: {},
        updatedAt: new Date().toISOString()
      };
      data.lobbies.push(newLobby);
      writeJsonDb(data);
      return newLobby;
    },
    findOneAndUpdate: async (roomCode, updates) => {
      const data = readJsonDb();
      if (!data.lobbies) data.lobbies = [];
      const index = data.lobbies.findIndex(l => l.roomCode === roomCode);
      if (index !== -1) {
        data.lobbies[index] = { 
          ...data.lobbies[index], 
          ...updates, 
          updatedAt: new Date().toISOString() 
        };
        writeJsonDb(data);
        return data.lobbies[index];
      }
      return null;
    },
    delete: async (roomCode) => {
      const data = readJsonDb();
      if (!data.lobbies) data.lobbies = [];
      const index = data.lobbies.findIndex(l => l.roomCode === roomCode);
      if (index !== -1) {
        data.lobbies.splice(index, 1);
        writeJsonDb(data);
        return true;
      }
      return false;
    }
  }
};
