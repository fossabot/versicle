# TTS Interface Harmonization Design

## 1. Introduction

### 1.1 Purpose
The goal of this design is to unify the interface and behavior of Local (WebSpeech, Capacitor) and Cloud (Google, OpenAI) TTS providers. Currently, the system exposes implementation details (Blobs vs Native) to the consumer. We aim to hide these details behind a unified interface where the `AudioPlayerService` simply requests to "play" text.

### 1.2 Scope
*   Redesign `ITTSProvider` to focus on a `play(text)` action.
*   Move caching and audio playback logic into a shared `BaseCloudProvider`.
*   Ensure Local providers implement `play` by invoking their native engines immediately.
*   Simplification of `AudioPlayerService`.

## 2. Current Architecture & Problem

### 2.1 Issues
*   **Leaky Abstraction:** `AudioPlayerService` handles Blobs for Cloud but ignores them for Local.
*   **Inconsistent Flow:** "Synthesize" means "Fetch Blob" for Cloud, but "Speak Immediately" for Local (in the user's proposed correction).
*   **Duplication:** Caching and Playback logic resides in the Service, making it harder to add new Cloud providers or change the playback engine.

## 3. Proposed Solution

We will adopt a **"Play-Centric"** interface. The Service tells the Provider to play text. The Provider handles the *how*.

### 3.1 Unified Strategy
*   **Top-Level Interface:** `ITTSProvider` exposes `play(text)`. It does NOT expose `SpeechSegment` or Blobs.
*   **Local Providers:** Implement `play(text)` by calling `speechSynthesis.speak` or `TextToSpeech.speak`.
*   **Cloud Providers:** Inherit from `BaseCloudProvider`. This base class handles:
    1.  Checking `TTSCache`.
    2.  Calling an abstract `fetchAudio(text)` to get the Blob if missing.
    3.  Caching the result.
    4.  Playing the audio via an internal player.
*   **Optimization:** A `preload(text)` method allows the Service to hint that a sentence is coming up, allowing Cloud providers to fetch and cache it in the background.

## 4. Implementation Steps

### Step 1: Interface Definition
Define the new `ITTSProvider` interface focusing on `play` and `preload`.

### Step 2: `BaseCloudProvider` (The Heavy Lifter)
*   Create `abstract class BaseCloudProvider implements ITTSProvider`.
*   Inject `TTSCache` and `LexiconService` (or handle lexicon in Service? Service usually applies lexicon before passing text. Let's keep lexicon in Service for simplicity).
*   **Method `play(text)`**:
    *   Check Cache.
    *   If miss: `const { audio, alignment } = await this.fetchAudio(text)`.
    *   Save to Cache.
    *   Emit `meta` event (with alignment).
    *   Load `audio` into internal `AudioElementPlayer`.
    *   Play.
*   **Method `preload(text)`**:
    *   Check Cache.
    *   If miss: `fetchAudio(text)` and save to Cache.
*   **Abstract Method `fetchAudio(text)`**: Implemented by Google/OpenAI/etc. to return Blob + Alignment.

### Step 3: Local Providers
*   **`WebSpeechProvider`**: `play(text)` calls `speak`. `preload` is a no-op.
*   **`CapacitorTTSProvider`**: `play(text)` calls `speak`. `preload` is a no-op.

### Step 4: `AudioPlayerService` Refactor
*   Remove direct cache management logic.
*   Remove direct `AudioElementPlayer` usage.
*   Change loop:
    ```typescript
    // Preload next
    if (queue[nextIndex]) provider.preload(queue[nextIndex].text);

    // Play current
    await provider.play(currentItem.text);
    ```
*   Listen for `meta` event to update `SyncEngine`.

## 5. End State Interface Specification

### 5.1 `ITTSProvider`

```typescript
export interface TTSOptions {
  voiceId: string;
  speed: number;
  volume?: number;
}

export interface ITTSProvider {
  id: string;

  init(): Promise<void>;
  getVoices(): Promise<TTSVoice[]>;

  /**
   * Requests the provider to speak the given text.
   *
   * **Behavior:**
   * - **Cloud:** Checks cache, downloads if needed, then plays the audio blob.
   * - **Local:** Immediately triggers the native TTS engine.
   *
   * **Blocking:**
   * - Returns a Promise that resolves when playback *starts*.
   *
   * @param text The text to speak.
   * @param options Playback options.
   */
  play(text: string, options: TTSOptions): Promise<void>;

  /**
   * Hints to the provider that this text will be needed soon.
   *
   * **Behavior:**
   * - **Cloud:** Downloads and caches the audio.
   * - **Local:** No-op (usually).
   */
  preload(text: string, options: TTSOptions): Promise<void>;

  pause(): void;
  resume(): void;
  stop(): void;

  on(callback: (event: TTSEvent) => void): void;
}
```

### 5.2 `BaseCloudProvider` (Abstract)

```typescript
abstract class BaseCloudProvider implements ITTSProvider {
  // ...

  /**
   * Abstract method for subclasses to implement the API call.
   * This is NOT part of the public ITTSProvider interface.
   */
  protected abstract fetchAudioData(text: string, options: TTSOptions): Promise<{ audio: Blob, alignment?: Timepoint[] }>;

  // Implements play() by orchestration: Cache -> Fetch -> Play
}
```

### 5.3 Events

```typescript
export type TTSEvent =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'error'; error: any }
  | { type: 'timeupdate'; currentTime: number }
  | { type: 'boundary'; charIndex: number }
  | { type: 'meta'; alignment: Timepoint[] }; // New event to pass alignment data to Service
```

### 5.4 Assumptions

1.  **Lexicon Application**: The `AudioPlayerService` applies the lexicon (regex replacement) *before* passing the text to `provider.play()`. The provider receives "clean", pronounceable text.
2.  **Cache Keys**: `BaseCloudProvider` generates cache keys based on text, voice, and speed.
3.  **Queueing**: `AudioPlayerService` still manages the queue. It waits for the `end` event of the current provider before calling `play` on the next item.
4.  **Gapless Playback**: `preload()` is critical for Cloud providers to minimize the gap between `play()` calls. `AudioPlayerService` should call `preload()` for the *next* item as soon as the current item starts playing.
