import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackgroundAudio } from './BackgroundAudio';

describe('BackgroundAudio', () => {
  let backgroundAudio: BackgroundAudio;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAudio: any;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock Audio
    mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        currentTime: 0,
        loop: false,
        paused: true,
        volume: 1,
        src: '',
        getAttribute: vi.fn((attr) => {
             if (attr === 'src') return mockAudio.src;
             return null;
        })
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.Audio = vi.fn(function() { return mockAudio; }) as any;

    backgroundAudio = new BackgroundAudio();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
        expect(mockAudio.loop).toBe(true);
        expect(mockAudio.src).toContain('silence');
    });
  });

  describe('play', () => {
      it('should play if paused', () => {
          mockAudio.paused = true;
          backgroundAudio.play();
          expect(mockAudio.play).toHaveBeenCalled();
      });

      it('should not play if already playing', () => {
          mockAudio.paused = false;
          backgroundAudio.play();
          expect(mockAudio.play).not.toHaveBeenCalled();
      });

      it('should cancel pending pause', () => {
        backgroundAudio.pause();
        expect(mockAudio.pause).not.toHaveBeenCalled();

        backgroundAudio.play();
        vi.advanceTimersByTime(600);
        expect(mockAudio.pause).not.toHaveBeenCalled();
        expect(mockAudio.play).toHaveBeenCalled();
      });
  });

  describe('pause', () => {
      it('should delay pause', () => {
          backgroundAudio.pause();
          expect(mockAudio.pause).not.toHaveBeenCalled();

          vi.advanceTimersByTime(400);
          expect(mockAudio.pause).not.toHaveBeenCalled();

          vi.advanceTimersByTime(101); // 501ms total
          expect(mockAudio.pause).toHaveBeenCalled();
      });
  });

  describe('stop', () => {
      it('should pause audio immediately and reset time', () => {
          backgroundAudio.stop();
          expect(mockAudio.pause).toHaveBeenCalled();
          expect(mockAudio.currentTime).toBe(0);
      });

      it('should cancel pending pause', () => {
        backgroundAudio.pause();
        backgroundAudio.stop();
        expect(mockAudio.pause).toHaveBeenCalled(); // from stop()
        mockAudio.pause.mockClear();

        vi.advanceTimersByTime(600);
        expect(mockAudio.pause).not.toHaveBeenCalled(); // delayed pause cancelled
      });
  });

  describe('setConfig', () => {
      it('should update audio settings', () => {
          backgroundAudio.setConfig({ silentAudioType: 'white-noise', whiteNoiseVolume: 0.5 });

          expect(mockAudio.volume).toBe(0.5);
          expect(mockAudio.src).toContain('white-noise');

          backgroundAudio.setConfig({ silentAudioType: 'silence', whiteNoiseVolume: 0.5 });
          expect(mockAudio.volume).toBe(1.0);
          expect(mockAudio.src).toContain('silence');
      });

      it('should handle audio switch correctly', () => {
          // Playing silence
          mockAudio.paused = false;
          mockAudio.src = 'silence.ogg';

          // Switch to white noise
          backgroundAudio.setConfig({ silentAudioType: 'white-noise', whiteNoiseVolume: 0.5 });

          expect(mockAudio.pause).toHaveBeenCalled();
          expect(mockAudio.src).toContain('white-noise');
          expect(mockAudio.play).toHaveBeenCalled();
      });
  });
});
