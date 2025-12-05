# **Technical Design Document: Deterministic Mock TTS System**

**Status: Implemented**

Validation Test Suite for versicle

## **1\. Problem Statement**

The current validation suite relies on the browser's native SpeechSynthesis API. This introduces several indeterministic factors that make automated testing brittle or impossible:

1. **Audio Hardware Dependency:** Tests may fail in CI/CD environments (e.g., Docker containers) lacking audio drivers.  
2. **Variable Timing:** Native TTS timing varies by voice, OS, and system load, making it impossible to assert precise synchronization logic (e.g., highlighting).  
3. **Opaque Execution:** There is no standard way to "read" what is currently being spoken to verify content without analyzing raw audio.

## **2\. Objective**

To implement a full-featured, deterministic polyfill for the Web Speech API (SpeechSynthesis and SpeechSynthesisUtterance) that:

* Runs "headless" (no audio output required).  
* Emits textual representations of spoken content for verification.  
* Adheres to a configurable, deterministic cadence.
* Maintains the asynchronous, event-driven nature of the native API using a background worker thread.

## **3\. Architecture**

The solution implements a **Client-Server model** entirely within the browser context.

* **The Client (Main Thread):** A Polyfill replacing `window.speechSynthesis`. It handles the API surface area, manages `SpeechSynthesisUtterance` instances, and bridges communication to the worker.
* **The Server (Service Worker):** A `mock-tts-sw.js` script running in a background thread. It acts as the "Audio Engine," managing the playback queue, calculating word durations, and emitting timing events.

### **3.1 Component Diagram**

```sequenceDiagram  
    participant App as Versicle App  
    participant Poly as Mock Polyfill (Main Thread)  
    participant SW as Service Worker (Background)

    Note over App, Poly: Initialization  
    App->>Poly: window.speechSynthesis.speak(utterance)  
    Poly->>Poly: Store utterance reference  
    Poly->>SW: POST_MESSAGE { type: 'SPEAK', payload: text, rate }

    Note over SW: Processing Loop  
    SW->>SW: Parse text -> words  
    loop Every Word (calculated duration)  
        SW->>Poly: { type: 'boundary', charIndex, word }  
        Poly->>App: utterance.onboundary(event)  
        Poly->>DOM: Update Debug DOM <div id="tts-debug">  
    end

    SW->>Poly: { type: 'end' }  
    Poly->>App: utterance.onend(event)
```

## **4\. Implementation Details**

### **4.1 The Service Worker (`public/mock-tts-sw.js`)**

The Service Worker acts as the source of truth for timing. It replaces the opaque "black box" of the OS TTS engine.

* **Cadence Logic:**  
  * Standard WPM: 150.
  * Formula: Duration\_ms \= ((60 / WPM) * 1000) * (1 / Rate).
* **Tokenization:**  
  * Input text is split by whitespace to determine "boundaries."  
  * Punctuation is included in the preceding word token.  
* **State Machine:**  
  * IDLE: Queue empty.  
  * SPEAKING: Processing queue.  
  * PAUSED: Queue preserved, timers cleared.

### **4.2 The Polyfill (`verification/tts-polyfill.js`)**

This component strictly adheres to the IDL definitions of the Web Speech API.

* **Voice Masquerading:**  
  * Exposes `getVoices()` returning mock voices.
  * Triggers the `voiceschanged` event shortly after load.
* **Event Dispatch:**  
  * Maps messages from the SW (boundary, end) to `SpeechSynthesisEvent`.
* **Debug DOM:**
  * Creates and updates a `<div id="tts-debug">` element with `data-status`, `data-last-event`, and `textContent` for Playwright verification.

### **4.3 Integration & Verification**

To verify the system visually and programmatically:

1. **Console Emission:** The SW logs `%c 🗣️ [MockTTS]: "word"` to the console.
2. **DOM Emission:** The Polyfill updates `#tts-debug`. Playwright asserts against this element.
3. **Verification Suite:** A dedicated test `verification/test_mock_tts.py` validates the mock implementation itself.

## **5\. Completed Actions**

1.  **Created `public/mock-tts-sw.js`:** Implements the timing loop and messaging.
2.  **Created `verification/tts-polyfill.js`:** Implements `SpeechSynthesis` polyfill and SW registration.
3.  **Updated `verification/conftest.py`:** Automatically injects the polyfill into every Playwright test session.
4.  **Created `verification/test_mock_tts.py`:** Verified Sanity, Pause/Resume, and Cancel functionality of the mock system.
5.  **Fixed `verification/test_maintenance.py`:** Resolved a pre-existing flake/bug in dialog handling.
6.  **Verified Suite:** All tests passed locally. `npm test` passed.

## **6\. Usage**

Tests running in the verification suite automatically use the Mock TTS. No changes are needed to application code.

To debug, look at the `#tts-debug` element in the browser during test execution (or screenshots).
