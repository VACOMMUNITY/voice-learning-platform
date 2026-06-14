# Vocalize - Voice-Controlled Gaming Tools for Enhanced Learning

Vocalize is an advanced, AI-powered full-stack web application designed for students and educators in the skill ecosystem. By integrating browser-based Speech Recognition (`Web Speech API`) and dynamic real-time Audio Analysis (`Web Audio API`), it allows users to navigate panels and complete educational game challenges using **voice commands** rather than traditional keyboards or mice. 

This platform aims to improve vocabulary, cognitive memory, phonetic articulation speed, pronunciation accuracy, and overall engagement in interactive gaming environments.

---

## 🌟 Core Features

### 1. Unified Authentication System
* **Secure JWT Login/Signup**: Email validation, password crypt hashing (using `bcryptjs`), and access level assignments.
* **Role-Based Guards**: First user dynamically registered becomes the **System Administrator**, while subsequent users are registered as **Students** with protected routing parameters.
* **Auto Session Cleanup**: Idle security tracker automatically logs out session states after 10 minutes of complete inactivity.

### 2. Live Speech & Audio Visualizer
* **Continuous Web Speech recognition**: Captures real-time vocalizations, matching them to system commands (`"start"`, `"stop"`, `"next"`, `"exit"`, etc.).
* **Web Audio RMS Meter**: Real-time microphone sensitivity/decibel volume tracking (0-100%) and a fluid overlapping sine waveform canvas renderer.
* **Ambient Chimes Synthesizer**: Programmatic audio sound effects (correct chimes, buzzers, level-ups, ambient drones) generated using Web Audio oscillators, avoiding heavy MP3 file assets.

### 3. Voice-Controlled Game Suite
* **Game 1: Voice Quiz Challenge**: A timed quiz challenge where students answer multiple-choice questions by speaking the answers or options. Responds to vocal control overrides like `"repeat"` and `"next"`.
* **Game 2: Pronunciation Trainer**: Articulate technical words or tongue twisters. Compares inputs using Levenshtein distance calculations, returning accuracy percentages and displaying green/red diff markups.
* **Game 3: Memory Voice Game**: Flash sequences of random words, challenging students to recall them Chronologically. Sequence lengths grow with streak achievements!

### 4. Admin Panel & CRUD Management
* **System Analytics Overview**: Interactive breakdown counters for Total Registrations, Active Sessions, Accuracies, and Game play breakdown charts.
* **CRUD Question Manager**: Form dialog inputs allowing administrators to ADD, EDIT, or DELETE quiz questions instantly.
* **Voice Command logs**: Live reporting streams of every caught vocal command.

### 5. Smart AI Tutor Suggestions
* **Performance Diagnostics**: Log queries evaluate study behaviors and calculate overall averages to identify vocal strengths and weaknesses.
* **Adaptive Difficulty recommendation**: Suggestions for beginner, intermediate, or advanced tracks based on error ratios.

---

## 🛠️ Technology Stack

* **Frontend**: React (TypeScript + Vite), Premium Glassmorphic Vanilla CSS, Canvas Confetti.
* **Backend**: Node.js, Express.js REST API, JSONWebToken, BcryptJS.
* **Database**: Dual Adapter System:
  * **MongoDB Atlas** (using Mongoose schemas).
  * **Local JSON File Fallback** (`server/data/db_store.json`). Connects immediately on first boot without requiring any local database server setup!

---

## 📁 Folder Structure

```text
voice-learning-platform/
├── index.html                  # Main client template
├── package.json                # Root client configuration
├── vite.config.ts              # Vite configurations
├── src/                        # React Frontend Source
│   ├── main.tsx                # Client entry hook
│   ├── App.tsx                 # View state context & idle logs
│   ├── App.css                 # Global base layout styles
│   ├── index.css               # Design system & Glassmorphic variables
│   ├── components/             # Reusable UI Components
│   │   ├── GlassCard.tsx       # Reusable premium panels
│   │   ├── MicVisualizer.tsx   # Canvas waveform & microphone toggles
│   │   └── Notification.tsx    # Slide-in toast alerts
│   ├── services/               # Core Systems
│   │   ├── api.ts              # REST API Client wrapper
│   │   ├── audio.ts            # Web Audio Analyser & sound oscillators
│   │   └── speech.ts           # Web Speech Recognition API
│   └── views/                  # Screen Views
│       ├── Login.tsx           # Authentication forms
│       ├── Signup.tsx          # Registration forms
│       ├── Dashboard.tsx       # Profile, CSS bar graphs, mini advice
│       ├── VoiceQuiz.tsx       # Game 1 Challenge
│       ├── PronunciationTrainer.tsx # Game 2 Articulations
│       ├── MemoryGame.tsx      # Game 3 Sequence streaks
│       ├── Leaderboard.tsx     # Gold/Silver/Bronze podiums
│       ├── AIAdvisor.tsx       # Detailed tutor breakdown report
│       └── AdminPanel.tsx      # Aggregate graphs & Quiz CRUD Forms
└── server/                     # Express Backend API
    ├── package.json            # Server package configurations
    ├── server.js               # Entry point Express script
    ├── db.js                   # Mongoose / JSON Database adapter
    ├── .env                    # System variables file
    ├── .env.example            # Environment template variables
    ├── middleware/
    │   └── authMiddleware.js   # JWT verification guards
    ├── routes/
    │   ├── auth.js             # Registration & Profile session routes
    │   ├── games.js            # Games scoring & AI Advisor generators
    │   └── admin.js            # Analytical reports & Question CRUDs
    └── data/
        └── db_store.json       # Auto-seeded local JSON fallback database
```

---

## ⚡ Quick Start & Installation

Ensure you have [Node.js](https://nodejs.org) (v16+) installed.

### Step 1: Install Server Dependencies
Open a terminal in the `/server` directory and run:
```bash
cd server
npm install
```

### Step 2: Install Frontend Dependencies
Open a second terminal in the root directory of the project and run:
```bash
npm install
```

### Step 3: Run the Application
1. **Start Backend Server**: In the `/server` terminal, run:
   ```bash
   npm run dev
   ```
   This boots the API server on `http://localhost:5000` with the pre-seeded JSON fallback database database activated!

2. **Start Frontend Client**: In the root terminal, run:
   ```bash
   npm run dev
   ```
   This spins up the Vite dev server on `http://localhost:5173`. Open your browser and navigate to the link to play!

---

## 🛡️ Administrative Demo Credentials

Since the system features **automatic role allocation**, the **first user** to register via the signup form is automatically designated as the **System Administrator**! 
1. Open the signup screen and create an account (e.g. `admin@voice.edu`).
2. Logging in immediately reveals the **Admin Console** tab in the header.
3. Access the console to add, edit, or delete questions, view active user counters, and monitor vocal command history streams.

---

## 🚀 Deployment Instructions

### MongoDB Atlas Setup (Optional)
If you wish to deploy to production using an actual MongoDB Cloud Database:
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Grab the connection string.
3. Open `server/.env` and paste your string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/vocalize
   ```
4. Restart the backend server. It will automatically detect the Atlas URI and migrate your local databases online.

### Deploying to Render / Vercel
* **Vercel (Frontend)**:
  * Import the repository, select **Vite** framework, and build command `npm run build` (outputs to `/dist`).
* **Render (Backend API)**:
  * Deploy the `server/` directory as a **Web Service**.
  * Set environment variables `MONGODB_URI` and `JWT_SECRET` in the dashboard.
