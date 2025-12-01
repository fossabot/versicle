import type { ITTSProvider, SpeechSegment, TTSVoice } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TTSCallback = (event: { type: 'start' | 'end' | 'boundary' | 'error', charIndex?: number, error?: any }) => void;

export class WebSpeechProvider implements ITTSProvider {
  id = 'local';
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private callback: TTSCallback | null = null;
  private voicesLoaded = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  async init(): Promise<void> {
    if (this.voicesLoaded && this.voices.length > 0) return;

    return new Promise((resolve) => {
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        this.voices = this.synth.getVoices();
        this.voicesLoaded = true;
        resolve();
      };

      // Try immediately
      const currentVoices = this.synth.getVoices();
      if (currentVoices.length > 0) {
        finish();
        return;
      }

      // Wait for event
      const onVoicesChanged = () => {
        finish();
        this.synth.removeEventListener('voiceschanged', onVoicesChanged);
      };

      // Using addEventListener is safer than setting onvoiceschanged directly
      // However, SpeechSynthesis event support varies. Standard is addEventListener.
      // If not supported, we fall back to onvoiceschanged.
      if (this.synth.addEventListener) {
          this.synth.addEventListener('voiceschanged', onVoicesChanged);
      } else {
          // Fallback for older implementations
          const original = this.synth.onvoiceschanged;
          this.synth.onvoiceschanged = (e) => {
              if (original) original.call(this.synth, e);
              onVoicesChanged();
          };
      }

      // Safety timeout: some browsers/OSs might not have voices or fail to fire event
      // We resolve anyway so the app doesn't hang.
      setTimeout(() => {
          if (!resolved) {
              console.warn('WebSpeechProvider: Voice loading timed out or no voices available.');
              finish();
          }
      }, 1000);
    });
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (!this.voicesLoaded || this.voices.length === 0) {
      await this.init();
    }
    return this.voices.map(v => ({
      id: v.name, // Using name as ID for local voices as it's usually unique enough or URI
      name: v.name,
      lang: v.lang,
      provider: 'local',
      originalVoice: v
    }));
  }

  async synthesize(text: string, voiceId: string, speed: number): Promise<SpeechSegment> {
    this.cancel(); // specific method to stop previous

    // Ensure voices are loaded before speaking (rare case but safer)
    if (this.voices.length === 0) {
        await this.init();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.voices.find(v => v.name === voiceId);
    if (voice) utterance.voice = voice;
    utterance.rate = speed;

    utterance.onstart = () => this.emit('start');
    utterance.onend = () => this.emit('end');
    utterance.onerror = (e) => this.emit('error', { error: e });
    utterance.onboundary = (e) => this.emit('boundary', { charIndex: e.charIndex });

    this.synth.speak(utterance);

    return { isNative: true };
  }

  stop(): void {
    this.cancel();
  }

  pause(): void {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  resume(): void {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  private cancel() {
    this.synth.cancel();
  }

  // Event handling registration
  on(callback: TTSCallback) {
    this.callback = callback;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(type: 'start' | 'end' | 'boundary' | 'error', data: any = {}) {
    if (this.callback) {
      this.callback({ type, ...data });
    }
  }
}
