// Advanced Browser Web Audio Engine
// Provides dynamic programmatic synthesizer sound effects and real-time mic volume tracking.

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private soundEnabled: boolean = true;

  constructor() {
    // Sound settings cached in localStorage
    const saved = localStorage.getItem('sound_enabled');
    this.soundEnabled = saved !== 'false';
  }

  // Initialize context lazily on user interaction
  private initCtx() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    localStorage.setItem('sound_enabled', String(enabled));
  }

  public isSoundEnabled() {
    return this.soundEnabled;
  }

  // Synthesize CORRECT chime
  public playCorrect() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Cute 8-bit positive chime: two quick notes
      const now = ctx.currentTime;
      osc.type = 'triangle';
      
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.setValueAtTime(0.15, now + 0.08);

      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.linearRampToValueAtTime(0, now + 0.3);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('AudioContext synth error:', e);
    }
  }

  // Synthesize WRONG buzzer
  public playWrong() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.25);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('AudioContext synth error:', e);
    }
  }

  // Synthesize LEVEL-UP celebratory chimes
  public playLevelUp() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4 -> C6 arpeggio
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        
        gain.gain.setValueAtTime(0, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.07 + 0.03);
        gain.gain.linearRampToValueAtTime(0, now + idx * 0.07 + 0.25);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } catch (e) {
      console.warn('AudioContext synth error:', e);
    }
  }

  // Synthesize GAME OVER / failure sound
  public playGameOver() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.type = 'sine';
      
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.6);
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn('AudioContext synth error:', e);
    }
  }

  // Start real-time microphone analyzer
  public async startMicAnalyzer(): Promise<MediaStream> {
    try {
      const ctx = this.initCtx();
      
      // Request mic permission
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      const source = ctx.createMediaStreamSource(this.micStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      return this.micStream;
    } catch (err) {
      console.error('Error starting mic analyzer:', err);
      throw err;
    }
  }

  // Stop microphone analyzer
  public stopMicAnalyzer() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    this.analyser = null;
  }

  // Retrieve current sensitivity volume level (0-100)
  public getMicVolume(): number {
    if (!this.analyser) return 0;
    
    const timeData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeData);
    
    // Calculate Root Mean Square (RMS) volume
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const amplitude = (timeData[i] - 128) / 128; // Normalize around 0
      sum += amplitude * amplitude;
    }
    
    const rms = Math.sqrt(sum / timeData.length);
    // Amplify and cap at 100
    const volume = Math.min(Math.round(rms * 450), 100);
    return volume;
  }

  // Retrieve analyzer frequency buffer (for drawing fluid waves on Canvas)
  public getByteFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    this.analyser.getByteFrequencyData(this.dataArray as any);
    return this.dataArray;
  }
}

export const audio = new AudioEngine();
