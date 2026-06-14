import React, { useEffect, useRef, useState } from 'react';
import { speech, type VoiceCommand } from '../services/speech';
import { audio } from '../services/audio';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface MicVisualizerProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onCommand?: (command: VoiceCommand, rawText: string) => void;
  listeningStateCallback?: (isListening: boolean) => void;
  placeholderText?: string;
  lang?: string;
}

export const MicVisualizer: React.FC<MicVisualizerProps> = ({
  onTranscript,
  onCommand,
  listeningStateCallback,
  placeholderText = "Click microphone and speak or say command...",
  lang = 'en-US'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  // Sync state with parent components
  useEffect(() => {
    listeningStateCallback?.(isListening);
    return () => {
      // Deactivate speech when unmounting
      if (isListening) {
        speech.deactivate();
        audio.stopMicAnalyzer();
      }
    };
  }, [isListening]);

  // Canvas fluid wave renderer
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Smooth cleaning of canvas frame
    ctx.clearRect(0, 0, width, height);

    // Get real-time audio frequencies from the analyzer
    const freqData = audio.getByteFrequencyData();
    const len = freqData.length || 64;

    ctx.lineWidth = 3;
    
    // Draw two overlapping glowing waves for premium aesthetics
    ctx.shadowBlur = 10;
    
    // Wave 1: Cyan/Secondary
    ctx.strokeStyle = '#06b6d4';
    ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    
    for (let i = 0; i < width; i++) {
      const freqIndex = Math.floor((i / width) * len);
      const amplitude = (freqData[freqIndex] || 0) / 255;
      // Synthesize sine offset
      const y = (height / 2) + Math.sin(i * 0.05 + Date.now() * 0.007) * (amplitude * (height * 0.45));
      ctx.lineTo(i, y);
    }
    ctx.stroke();

    // Wave 2: Purple/Primary
    ctx.strokeStyle = '#6366f1';
    ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    
    for (let i = 0; i < width; i++) {
      const freqIndex = Math.floor((i / width) * len);
      const amplitude = (freqData[len - freqIndex - 1] || 0) / 255;
      const y = (height / 2) + Math.cos(i * 0.04 + Date.now() * 0.009) * (amplitude * (height * 0.4));
      ctx.lineTo(i, y);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    
    // Loop
    animationRef.current = requestAnimationFrame(drawWaveform);
  };

  const toggleMic = async () => {
    setErrorMsg(null);

    if (isListening) {
      // Stop
      speech.deactivate();
      audio.stopMicAnalyzer();
      setIsListening(false);
      
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
      setVolume(0);
    } else {
      // Start Web Speech first, then attempt Web Audio visualizer concurrently
      try {
        setIsListening(true);

        speech.active({
          onResult: (text, isFinal) => {
            setTranscript(text);
            onTranscript?.(text, isFinal);
          },
          onCommand: (cmd, rawText) => {
            onCommand?.(cmd, rawText);
            
            // Clean recognized transient text once a final command is successfully caught
            setTranscript(`Command caught: "${cmd.toUpperCase()}"`);
            setTimeout(() => {
              setTranscript('');
            }, 1800);
          },
          onError: (errMsg) => {
            setErrorMsg(errMsg);
            setIsListening(false);
            audio.stopMicAnalyzer();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
          },
          onStateChange: (state) => {
            setIsListening(state);
            if (!state) {
              audio.stopMicAnalyzer();
              setVolume(0);
            }
          }
        }, lang);

        // Attempt visualizer loop (optional fallback if hardware driver blocks concurrent getUserMedia)
        try {
          await audio.startMicAnalyzer();
          
          volumeIntervalRef.current = window.setInterval(() => {
            setVolume(audio.getMicVolume());
          }, 100);

          setTimeout(() => {
            drawWaveform();
          }, 100);
        } catch (audioErr) {
          console.warn('Web Audio mic analyzer failed to start. Visualizer disabled but speech recognition will proceed.', audioErr);
        }

      } catch (err) {
        setErrorMsg('Microphone activation failed. Ensure permission is granted and try again.');
        setIsListening(false);
      }
    }
  };

  return (
    <div style={{ textAlign: 'center', width: '100%', margin: '20px 0' }}>
      
      {/* Listening Wave Animations Rings */}
      <div className="speech-pulse-container">
        {isListening && (
          <>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
          </>
        )}
        <div className={`pulse-mic ${isListening ? 'listening' : ''}`} onClick={toggleMic}>
          {isListening ? <Mic size={36} /> : <MicOff size={36} />}
        </div>
      </div>

      {/* Sensitivity Decibel Meter */}
      {isListening && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', fontWeight: 'bold' }}>
              VOLUME: {volume}%
            </span>
          </div>
          {/* Micro Visualizer Bar */}
          <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${volume}%`, 
              height: '100%', 
              background: volume > 70 ? 'var(--color-accent)' : 'var(--color-secondary)',
              transition: 'width 0.1s ease'
            }} />
          </div>
        </div>
      )}

      {/* HTML5 Fluid Frequency Waveform Canvas */}
      <div style={{ margin: '20px auto', maxWidth: '400px', display: isListening ? 'block' : 'none' }}>
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={80} 
          className="canvas-wave"
        />
      </div>

      {/* Real-time recognized text screen output */}
      <div style={{ minHeight: '45px', marginTop: '16px', padding: '0 12px' }}>
        {transcript ? (
          <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-secondary)', textShadow: '0 0 10px rgba(6,182,212,0.2)' }}>
            "{transcript}"
          </p>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
            {placeholderText}
          </p>
        )}
      </div>

      {/* Error Output Displays */}
      {errorMsg && (
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(239,68,68,0.1)', 
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)', 
          padding: '10px 16px', 
          marginTop: '12px',
          color: 'var(--color-danger)',
          fontSize: '13px'
        }} className="shake-animation">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
export default MicVisualizer;
