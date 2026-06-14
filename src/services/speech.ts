// Advanced Web Speech API command parser wrapper
// Detects real-time speech and translates spoken terms to software triggers.

export type VoiceCommand = 'start' | 'stop' | 'jump' | 'left' | 'right' | 'next' | 'submit' | 'repeat' | 'exit';

interface SpeechEngineOptions {
  onResult: (text: string, isFinal: boolean) => void;
  onCommand?: (command: VoiceCommand, rawText: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (isListening: boolean) => void;
}

class SpeechEngine {
  private recognition: any = null;
  private isListening: boolean = false;
  private options: SpeechEngineOptions | null = null;
  private lastCommandTriggerTime: number = 0;
  
  // Mapping synonyms to core command actions
  private commandsMap: Record<string, VoiceCommand> = {
    'start': 'start',
    'begin': 'start',
    'play': 'start',
    
    'stop': 'stop',
    'pause': 'stop',
    
    'jump': 'jump',
    'leap': 'jump',
    'hop': 'jump',
    
    'left': 'left',
    'go left': 'left',
    
    'right': 'right',
    'go right': 'right',
    
    'next': 'next',
    'skip': 'next',
    
    'submit': 'submit',
    'done': 'submit',
    'confirm': 'submit',
    
    'repeat': 'repeat',
    'say again': 'repeat',
    'replay': 'repeat',
    
    'exit': 'exit',
    'quit': 'exit',
    'back': 'exit',
    'close': 'exit'
  };

  constructor() {
    // Check browser speech recognition API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // keep listening
      this.recognition.interimResults = true; // show raw live text as spoken
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.options?.onStateChange?.(true);
      };

      this.recognition.onend = () => {
        // If we were supposed to be listening, restart (continuous mode fallback)
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            // Already started or busy
          }
        } else {
          this.options?.onStateChange?.(false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Web Speech API encountered an error:', event.error);
        
        let userMessage = 'Speech recognition error.';
        if (event.error === 'not-allowed') {
          userMessage = 'Microphone permission blocked. Please check your browser privacy preferences.';
          this.isListening = false;
        } else if (event.error === 'no-speech') {
          return; // Suppress harmless timeouts
        } else if (event.error === 'aborted') {
          return; // Suppress harmless aborts
        }
        
        this.options?.onError?.(userMessage);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const liveText = (finalTranscript || interimTranscript).trim().toLowerCase();
        
        if (liveText) {
          // Send raw text to the visual listener
          const isFinal = !!finalTranscript;
          this.options?.onResult(liveText, isFinal);

          // Fast trigger command parsed instantly (no need to wait for final pause!)
          this.checkCommand(liveText);
        }
      };
    }
  }

  // Check if string matches any command key or synonym
  private checkCommand(text: string) {
    if (!this.options?.onCommand) return;
    
    // Prevent double execution in 1.2s window
    const now = Date.now();
    if (now - this.lastCommandTriggerTime < 1200) return;
    
    const words = text.split(' ');
    
    // Scan all words for potential commands
    for (let word of words) {
      if (this.commandsMap[word]) {
        this.lastCommandTriggerTime = now;
        this.options.onCommand(this.commandsMap[word], text);
        return;
      }
    }

    // Check full phrase synonym matching
    for (let phrase in this.commandsMap) {
      if (text.includes(phrase)) {
        this.lastCommandTriggerTime = now;
        this.options.onCommand(this.commandsMap[phrase], text);
        return;
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public active(opts: SpeechEngineOptions, lang: string = 'en-US') {
    if (!this.isSupported()) {
      opts.onError?.('Web Speech API is not supported in this browser. Please use Chrome, Safari or Edge.');
      return;
    }
    
    this.options = opts;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
    
    if (!this.isListening) {
      try {
        this.isListening = true;
        this.recognition.start();
      } catch (err) {
        console.warn('Speech engine start error:', err);
      }
    }
  }

  public deactivate() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Already stopped
      }
    }
    this.options?.onStateChange?.(false);
  }

  public getStatus() {
    return this.isListening;
  }
}

export const speech = new SpeechEngine();
