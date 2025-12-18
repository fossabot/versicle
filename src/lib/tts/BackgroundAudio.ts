import silenceUrl from '../../assets/silence.ogg';
import whiteNoiseUrl from '../../assets/white-noise.ogg';

export interface BackgroundAudioConfig {
    silentAudioType: 'silence' | 'white-noise';
    whiteNoiseVolume: number;
}

export class BackgroundAudio {
    private silentAudio: HTMLAudioElement;
    private config: BackgroundAudioConfig;
    private pauseTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly PAUSE_DELAY = 500;

    constructor(config: BackgroundAudioConfig = { silentAudioType: 'silence', whiteNoiseVolume: 0.1 }) {
        this.config = config;
        this.silentAudio = new Audio();
        this.silentAudio.loop = true;
        this.updateSilentAudio();
    }

    setConfig(config: BackgroundAudioConfig) {
        this.config = config;
        this.updateSilentAudio();
    }

    private updateSilentAudio() {
        const src = this.config.silentAudioType === 'white-noise' ? whiteNoiseUrl : silenceUrl;
        const currentSrc = this.silentAudio.getAttribute('src');
        if (currentSrc !== src) {
            const wasPlaying = !this.silentAudio.paused || this.pauseTimeout !== null;

            if (this.pauseTimeout) {
                clearTimeout(this.pauseTimeout);
                this.pauseTimeout = null;
            }

            if (!this.silentAudio.paused) this.silentAudio.pause();
            this.silentAudio.src = src;
            if (wasPlaying) {
                this.silentAudio.play().catch(e => console.warn("Background audio switch failed", e));
            }
        }
        if (this.config.silentAudioType === 'white-noise') {
            this.silentAudio.volume = Math.min(Math.max(this.config.whiteNoiseVolume, 0), 1);
        } else {
            this.silentAudio.volume = 1.0;
        }
    }

    play() {
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
            this.pauseTimeout = null;
        }
        if (this.silentAudio.paused) {
            this.silentAudio.play().catch(e => console.warn("Background audio play failed", e));
        }
    }

    pause() {
        if (this.pauseTimeout) return;
        this.pauseTimeout = setTimeout(() => {
            this.silentAudio.pause();
            this.pauseTimeout = null;
        }, this.PAUSE_DELAY);
    }

    stop() {
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
            this.pauseTimeout = null;
        }
        this.silentAudio.pause();
        this.silentAudio.currentTime = 0;
    }
}
