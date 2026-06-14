import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';

// Import routes
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import adminRoutes from './routes/admin.js';
import multiplayerRoutes from './routes/multiplayer.js';

// Setup environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with client URI (support local dev and deployment)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/multiplayer', multiplayerRoutes);

// Base route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Voice Learning Platform API is healthy.',
    time: new Date().toISOString(),
    dbMode: connectDB.isMongoDB ? 'MongoDB Atlas' : 'Local JSON Database Fallback'
  });
});

// Serve frontend build in production mode
const clientBuildPath = path.join(__dirname, '../dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Voice-Controlled Gaming Backend is running. Frontend build not found, please build it with npm run build.');
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'An unexpected error occurred on the server. Please try again later.'
  });
});

// Database and server bootup
const startServer = async () => {
  const MONGO_URI = process.env.MONGODB_URI;
  
  // Connect database (with local JSON fallback if it fails)
  await connectDB(MONGO_URI);

  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`📢 VOICE ECOSYSTEM BACKEND IS ONLINE & LISTENING`);
    console.log(`🔗 API Server: http://localhost:${PORT}`);
    console.log(`⚙️  Active Port: ${PORT}`);
    console.log(`🛡️  CORS: Enabled for all origins`);
    console.log(`==================================================`);
  });
};

startServer();
