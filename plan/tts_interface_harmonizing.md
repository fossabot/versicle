# TTS Interface Harmonization Design

## 1. Introduction

### 1.1 Purpose
The goal of this design is to unify the interface and behavior of Local (WebSpeech, Capacitor) and Cloud (Google, OpenAI) TTS providers. Currently, Cloud providers return an audio Blob which is played by the `AudioPlayerService`, while Local providers handle playback internally and immediately. This discrepancy leads to branching logic in the `AudioPlayerService`.

### 1.2 Scope
*   Refactor `ITTSProvider` interface.
*   Update `WebSpeechProvider` and `CapacitorTTSProvider` to defer playback.
*   Create/Update `BaseCloudProvider` to encapsulate audio playback logic.
*   Simplify `AudioPlayerService` to use a consistent "Synthesize -> Play" flow.

## 2. Current Architecture & Problem

### 2.1 Current Flow
*   **Local Provider:** `synthesize(text)` -> Triggers `speak()` immediately -> Returns `{ isNative: true }`.
*   **Cloud Provider:** `synthesize(text)` -> Fetches API -> Returns `{ isNative: false, audio: Blob }`.
*   **AudioPlayerService:**
    ```typescript
    if (provider.id === 'local') {
        await provider.synthesize(...);
        // Listens to provider events
    } else {
        const result = await provider.synthesize(...);
        // Cache logic...
        // Manually manages AudioElementPlayer to play result.audio
        // Manually updates SyncEngine
    }
    ```

### 2.2 Issues
*   **Inconsistency:** The Service has to know too much about how the provider works (Blob vs Native).
*   **Duplication:** Audio playback logic (handling `AudioElement`, events) is in the Service, not the Provider.
*   **Future Proofing:** Moving to Web Audio API (for future enhancements) would require changing the Service logic for Cloud providers, whereas Local providers would remain different.

## 3. Proposed Solution

We will standardize on a **"Synthesize then Play"** pattern for all providers.

### 3.1 Unified Strategy
*   **Decouple Execution:** Separate the "preparation" of speech (API call or object creation) from the "playback" (speaking).
*   **Provider Responsibilities:** Providers become responsible for the entire audio lifecycle, including playing the audio they generate (or delegate to the OS).
*   **Service Responsibilities:** The `AudioPlayerService` focuses on queue management, caching, and state tracking, treating the actual playback mechanism as a black box.

## 4. Implementation Steps

### Step 1: Interface & Type Definitions
*   Update `SpeechSegment` to optionally include `text`, `voiceId`, `speed` (for local replay) and `nativeUtterance` (for WebSpeech optimization).
*   Update `ITTSProvider` to include `play()` and standard `on()` signature.
*   Define `TTSEvent` to include `timeupdate` (with currentTime) and `boundary` (with charIndex).

### Step 2: Refactor `WebSpeechProvider`
*   Modify `synthesize` to create `SpeechSynthesisUtterance` but NOT call `speechSynthesis.speak()`. Return it in the segment.
*   Implement `play(segment)` to call `speechSynthesis.speak(segment.nativeUtterance)`.
*   Ensure event listeners are attached to the *current* utterance being played.

### Step 3: Refactor `CapacitorTTSProvider`
*   Modify `synthesize` to return a segment with params (`text`, `voiceId`, `speed`).
*   Implement `play(segment)` to call `TextToSpeech.speak`.

### Step 4: Create/Update `BaseCloudProvider`
*   Move `AudioElementPlayer` usage from `AudioPlayerService` to `BaseCloudProvider`.
*   Implement `play(segment)` to load the Blob into the internal player.
*   Forward player events (`timeupdate`, `ended`, `error`) via the `on` callback.

### Step 5: Refactor `AudioPlayerService`
*   Remove `AudioElementPlayer` instance.
*   Remove branching logic in `playInternal`.
*   Update event subscription to handle the unified events.
*   Update `SyncEngine` integration to listen to the provider's `timeupdate` event.

## 5. Benefits

*   **Polymorphism:** `AudioPlayerService` treats all providers uniformly.
*   **Encapsulation:** Playback complexity (AudioContext, HTMLAudioElement, etc.) is hidden within the Cloud Provider.
*   **Scalability:** Easier to add new providers or change the audio backend (e.g., to Web Audio API for effects) without touching the main service.

## 6. End State Interface Specification

### 6.1 `ITTSProvider`

```typescript
export interface ITTSProvider {
  /**
   * Unique identifier for the provider (e.g., 'local', 'google').
   */
  id: string;

  /**
   * Initializes the provider (loads voices, sets up audio context).
   * @returns Promise that resolves when ready.
   */
  init(): Promise<void>;

  /**
   * Retrieves available voices.
   */
  getVoices(): Promise<TTSVoice[]>;

  /**
   * Prepares the audio content for playback.
   *
   * **Blocking Behavior:**
   * - **Cloud:** Blocks (awaits) until the audio Blob is fully downloaded from the API.
   * - **Local:** Resolves immediately (or after minimal setup) returning the synthesis parameters.
   *
   * @param text The text to synthesize.
   * @param voiceId The ID of the voice to use.
   * @param speed The playback rate (1.0 = normal).
   * @param signal AbortSignal to cancel the operation (e.g. cancel download).
   * @returns Promise resolving to a SpeechSegment.
   */
  synthesize(text: string, voiceId: string, speed: number, signal?: AbortSignal): Promise<SpeechSegment>;

  /**
   * Initiates playback of a segment.
   *
   * **Blocking Behavior:**
   * - **Non-Blocking:** Resolves as soon as playback *starts* (or is successfully scheduled).
   * - Does NOT wait for playback to finish. Completion is signaled via the `ended` event.
   *
   * @param segment The segment returned by synthesize().
   * @returns Promise resolving when playback begins.
   */
  play(segment: SpeechSegment): Promise<void>;

  /**
   * Pauses the current playback.
   * **Blocking Behavior:** Resolves immediately.
   */
  pause(): void;

  /**
   * Resumes paused playback.
   * **Blocking Behavior:** Resolves immediately.
   */
  resume(): void;

  /**
   * Stops playback and cancels any pending operations.
   * **Blocking Behavior:** Resolves immediately.
   */
  stop(): void;

  /**
   * Subscribes to playback lifecycle events.
   */
  on(callback: (event: TTSEvent) => void): void;
}
```

### 6.2 Data Types

```typescript
/**
 * Represents the result of a synthesis operation, ready for playback.
 */
export interface SpeechSegment {
  /**
   * True if the provider uses the device's native TTS engine.
   * False if it uses a custom audio pipeline (Blob).
   */
  isNative: boolean;

  /**
   * The audio data (for Cloud providers).
   * Undefined for Local providers.
   */
  audio?: Blob;

  /**
   * The server-provided alignment data (for Cloud providers).
   */
  alignment?: Timepoint[];

  /**
   * The original text (required for Local replay).
   */
  text: string;

  /**
   * The voice ID used (required for Local replay).
   */
  voiceId: string;

  /**
   * The speed used (required for Local replay).
   */
  speed: number;

  /**
   * Optional pre-constructed utterance (optimization for WebSpeech).
   */
  nativeUtterance?: SpeechSynthesisUtterance;
}

/**
 * Events emitted by the provider during playback.
 */
export type TTSEvent =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'error'; error: any }
  | { type: 'timeupdate'; currentTime: number } // Continuous updates (Cloud)
  | { type: 'boundary'; charIndex: number };    // Discrete updates (Local)
```

### 6.3 Lifecycle & Assumptions

1.  **Synthesize -> Play Handoff**:
    *   The `AudioPlayerService` **MUST** call `synthesize()` before `play()`.
    *   `synthesize()` is the expensive operation for Cloud (network I/O). It is safe and expected to cache the result (the `SpeechSegment`) if it contains a Blob.
    *   `play()` is computationally cheap and safe to call multiple times on the same segment (e.g., for replay or after seeking).

2.  **Concurrency & Locking**:
    *   The Provider is single-channel. Calling `play()` while another segment is playing **MUST** interrupt the previous segment (implicit stop).
    *   The `AudioPlayerService` maintains the queue and lock; it should ensure it doesn't call `play()` on two different providers simultaneously without managing the transition.

3.  **Event Guarantees**:
    *   **Start:** `play()` will always trigger a `start` event shortly after resolving.
    *   **End:** The `end` event is guaranteed to fire when audio finishes naturally.
    *   **Stop:** Calling `stop()` causes audio to cease immediately. It **SHOULD NOT** fire an `end` event (to distinguish from natural completion), but typically `AudioPlayerService` handles the state change explicitly when it calls stop.
