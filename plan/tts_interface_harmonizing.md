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

### 3.1 Unified Interface (`ITTSProvider`)

```typescript
interface ITTSProvider {
    // ... init, getVoices ...

    /**
     * Prepares the audio or utterance.
     * Does NOT start playback.
     * Returns a segment containing metadata and potentially audio data.
     */
    synthesize(text: string, voiceId: string, speed: number, signal?: AbortSignal): Promise<SpeechSegment>;

    /**
     * Plays the given segment.
     */
    play(segment: SpeechSegment): Promise<void>;

    /**
     * Pauses playback.
     */
    pause(): void;

    /**
     * Resumes playback.
     */
    resume(): void;

    /**
     * Stops playback.
     */
    stop(): void;

    /**
     * Subscribes to playback events (start, end, error, timeupdate, boundary).
     */
    on(callback: (event: TTSEvent) => void): void;
}
```

### 3.2 Logic Updates

#### **Local Providers (WebSpeech, Capacitor)**
*   **`synthesize`**: Will no longer call `speak`. Instead, it will capture the parameters (text, voice, rate) and return a `SpeechSegment` containing them (and potentially a prepared `SpeechSynthesisUtterance` for WebSpeech).
*   **`play`**: Will take the segment and execute the actual `speak` command.

#### **Cloud Providers (BaseCloudProvider)**
*   **`synthesize`**: Remains largely the same (fetches Blob), but returns it in the `SpeechSegment`.
*   **`play`**: Will contain the logic currently in `AudioPlayerService`'s cloud branch. It will use an internal `AudioElementPlayer` (or future `WebAudioPlayer`) to play the Blob.
*   **Events**: The provider will listen to its internal player's events (`timeupdate`, `ended`, `error`) and re-emit them as standard `TTSEvent`s.

#### **AudioPlayerService**
*   The logic simplifies to:
    ```typescript
    // 1. Synthesize (or get from cache)
    let segment = await cache.get(...) || await provider.synthesize(...);

    // 2. Cache if new and has audio
    if (segment.audio && !cached) cache.put(segment);

    // 3. Play
    await provider.play(segment);
    ```
*   It subscribes to `provider.on(...)` for ALL providers to handle state changes (`playing`, `stopped`) and synchronization (`timeupdate` for cloud, `boundary` for local).

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
