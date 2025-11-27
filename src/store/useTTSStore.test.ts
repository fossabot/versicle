import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTTSStore } from './useTTSStore';

describe('useTTSStore', () => {
  beforeEach(() => {
    useTTSStore.setState({
      isPlaying: false,
      rate: 1,
      pitch: 1,
      voice: null,
    });
  });

  afterEach(() => {
      // Cleanup if needed
      vi.clearAllMocks();
  });

  it('should have initial state', () => {
    const state = useTTSStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.rate).toBe(1);
    expect(state.pitch).toBe(1);
    expect(state.voice).toBeNull();
  });

  it('should set playing state', () => {
    useTTSStore.getState().setPlaying(true);
    expect(useTTSStore.getState().isPlaying).toBe(true);
  });

  it('should play, pause, and stop', () => {
    useTTSStore.getState().play();
    expect(useTTSStore.getState().isPlaying).toBe(true);

    useTTSStore.getState().pause();
    expect(useTTSStore.getState().isPlaying).toBe(false);

    useTTSStore.getState().play();
    useTTSStore.getState().stop();
    expect(useTTSStore.getState().isPlaying).toBe(false);
  });

  it('should set rate', () => {
    useTTSStore.getState().setRate(1.5);
    expect(useTTSStore.getState().rate).toBe(1.5);
  });

  it('should set pitch', () => {
    useTTSStore.getState().setPitch(1.2);
    expect(useTTSStore.getState().pitch).toBe(1.2);
  });

  it('should set voice', () => {
    // Mock voice object
    const voice = { name: 'Test Voice', lang: 'en-US' } as SpeechSynthesisVoice;
    useTTSStore.getState().setVoice(voice);
    expect(useTTSStore.getState().voice).toBe(voice);
  });
});
