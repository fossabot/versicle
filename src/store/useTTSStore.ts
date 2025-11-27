import { create } from 'zustand';

interface TTSState {
  isPlaying: boolean;
  rate: number;
  pitch: number;
  voice: SpeechSynthesisVoice | null;
  setPlaying: (isPlaying: boolean) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
}

export const useTTSStore = create<TTSState>((set) => ({
  isPlaying: false,
  rate: 1.0,
  pitch: 1.0,
  voice: null,
  setPlaying: (isPlaying) => set({ isPlaying }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false }),
  setRate: (rate) => set({ rate }),
  setPitch: (pitch) => set({ pitch }),
  setVoice: (voice) => set({ voice }),
}));
