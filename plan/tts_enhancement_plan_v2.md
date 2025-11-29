# **Audio Feature Enhancements**

# **Feature Request: Audio Pipeline Infrastructure (Web Audio Graph)**

Priority: Critical (Foundation)  
Component: lib/tts/audio  
Dependencies: AudioPlayerService, useTTSStore  
Rationale & Problem Statement:  
The current audio implementation relies on the HTML5 AudioElement (new Audio(src)), which operates fundamentally as a "File Player." While sufficient for basic playback, this approach has fundamental limitations that block our roadmap for an immersive experience:

* **Gapless Playback:** AudioElement relies on onended event callbacks to trigger the next track. This introduces an unavoidable latency (20-50ms) between segments, destroying the rhythm of natural speech.  
* **No Signal Processing:** We cannot access the raw PCM data to trim silence ("Smart Speed") or normalize volume levels between different TTS providers.  
* **Mixing Limitations:** We cannot smoothly cross-fade or mix background ambience without managing multiple competitive \<audio\> tags, which is performant-heavy and sync-prone.  
* **Platform Inconsistency:** Different browsers (Safari on iOS vs Chrome on Android) handle AudioElement autoplay policies and background suspension differently, leading to fragile playback states.

Solution:  
Migrate to a Web Audio API Directed Acyclic Graph (DAG). This architecture treats audio as a continuous stream of data flowing through modular processing nodes, allowing for sample-accurate scheduling and real-time manipulation.  
**User Stories:**

* **As a Developer:** I need a centralized AudioGraph service that exposes slot-in connection points (Nodes) so that I can easily insert new DSP features (like Equalizers, Spatial Panners, or Analysers) without rewriting the playback logic.  
* **As a Listener:** I want the transition between sentences to be imperceptible so that the TTS sounds like a continuous narration rather than a playlist of files.  
* **As a Mobile User:** I want the app to handle interruptions (calls, notifications) gracefully without losing my place or crashing the audio driver.

**Technical Implementation:**

1. **WebAudioEngine (Singleton):**  
   * Create src/lib/tts/audio/WebAudioEngine.ts.  
   * **Lifecycle Management:** Manage a single AudioContext lifecycle. Implement a robust state machine to handle suspended, running, and interrupted states.  
   * **Autoplay Unlock:** Expose a resume() method bound to the first user interaction (touchstart/click) to satisfy strict iOS autoplay policies.  
   * **Keep-Alive:** Implement a workaround for PWA background throttling (e.g., playing a silent buffer every 30 seconds if the OS aggressively suspends the thread).  
2. **Node Graph Architecture:**  
   * **Voice Chain:** Source (BufferSource) \-\> Gain (Voice Volume) \-\> Panner (Optional Center) \-\> MasterGain.  
   * **Ambience Chain:** AmbienceSource (Loop) \-\> AmbienceGain (Background Volume) \-\> MasterGain.  
   * **Output Chain:** MasterGain \-\> DynamicsCompressor (Limiter) \-\> Destination.  
   * **Why Compressor?** Mixing voice \+ ambience can exceed 0dB. A limiter prevents digital clipping/distortion.  
3. **BufferScheduler (The "Gapless" Engine):**  
   * **Lookahead:** Implement a nextStartTime pointer.  
   * **Queue:** Maintain a rolling queue of AudioBuffers (Current \+ Next 2).  
   * **Scheduling:** Implement schedule(buffer) which calculates precise start times (buffer\[n\].start \=== buffer\[n-1\].end).  
   * **Drift Correction:** If the hardware clock drifts or the thread hangs, detect the gap and perform a "catch-up" seek rather than overlapping audio.

# **Feature Request: Text Sanitization Engine (Cruft Removal)**

Priority: High  
Component: lib/tts/processors  
Rationale:  
Raw EPUB text often contains non-narrative artifacts such as page numbers, ISBNs, citations, and navigation links. Hearing these read aloud ("Page 42", "http slash slash...") breaks immersion and wastes API costs on generating useless audio. Furthermore, reading out long strings of "dash dash dash" or "asterisk asterisk" is annoying.  
User Story:  
As a listener, I want the reader to skip page numbers, URLs, and citations automatically so that the narrative flow is uninterrupted. I also want it to intelligently handle visual breaks without speaking them.  
**Acceptance Criteria:**

* **Page Numbers:** The system must identify and remove lines matching patterns like ^\\s\*(Page\\s+)?\\d+\\s\*$ or standalone integers between paragraphs.  
* **URLs:** The system must strip HTTP/HTTPS links and www. patterns, replacing them with a silence or simply removing them.  
* **Citations:** The system must remove academic markers like \[1\], (Fig. 2\), or (Smith, 2020\).  
* **Visual Separators:** Convert \* \* \* or \--- into a 500ms pause, rather than reading "asterisk asterisk asterisk".  
* **Safety:** The system must NOT remove dialogue or narrative numbers (e.g., "He was 12 years old").  
* **Config:** User can toggle "Aggressive Sanitization" in settings.  
* **Logging:** In debug mode, log stripped content to the console to help diagnose over-aggressive filtering.

**Technical Implementation:**

* Create src/lib/tts/processors/Sanitizer.ts.  
* Implement a process(text: string): string method containing a pipeline of RegExp.replace operations.  
* **Safety Check:** If a replacement removes \>50% of the paragraph text, flag it or skip replacement to avoid deleting valid short sentences.  
* **Unit Tests:**  
  * Input: "It was the best of times. 42 It was the worst of times." \-\> Output: "It was the best of times. It was the worst of times."  
  * Input: "See \[12\] for details." \-\> Output: "See for details."  
  * Input: "Visit https://www.google.com/search?q=google.com for info." \-\> Output: "Visit for info."

# **Feature Request: User Pronunciation Lexicon**

Priority: Medium  
Component: lib/tts, Settings  
Rationale:  
TTS engines consistently mispronounce proper nouns, especially in fantasy/sci-fi genres (e.g., "Sazed", "Hermione", "Cthulhu"). Users need a mechanism to enforce correct phonetics to maintain immersion. Without this, users are constantly pulled out of the story by jarring mispronunciations.  
User Story:  
As a reader of fantasy novels, I want to define custom pronunciations for specific words so that the immersion isn't broken by mispronounced character names. I want these rules to apply globally to the book or series I am reading.  
**Acceptance Criteria:**

* **UI:** Add an "Add Pronunciation" option to the text selection context menu.  
* **Settings Interface:** Provide a list view to Manage/Edit/Delete custom word pairs (Key \-\> Phonetic Replacement).  
* **Storage:** Persist the dictionary in IndexedDB or localStorage, scoped to the current book (or optionally global).  
* **Processing:** Apply Find/Replace logic *after* sanitization but *before* sending text to the TTS API.  
* **Case Sensitivity:** Support Case-Insensitive matching (replacing "Sazed" and "sazed").

**Technical Implementation:**

* Create a LexiconService.  
* Store mappings as Map\<original, replacement\>.  
* **Algorithm:** Use RegExp with word boundaries \\b to prevent partial matches (e.g., replacing "her" inside "there").  
* **Optimization:** Sort keys by length (longest first) to prevent sub-string replacement issues. Compile all keys into a single RegExp pass if the dictionary size is manageable (\< 1000 items).  
* **Import/Export:** Allow users to export their lexicon as a JSON file to share with other readers of the same series.

# **Feature Request: Chapter Pre-roll (Announcer)**

Priority: Low (Delight)  
Component: lib/tts  
Rationale:  
TTS playback currently jumps between chapters instantly. In a physical book or audiobook, there is visual or auditory space. A synthesized announcer provides a necessary mental bookmark and context switch, allowing the user to reset their attention.  
User Story:  
As a listener, I want the app to announce the chapter title and estimated duration before reading the text, so I know where I am in the book without looking at the screen.  
**Acceptance Criteria:**

* **Trigger:** Detect when playback transitions to a new navPoint (Chapter).  
* **Content:** Generate a synthetic segment: "Chapter \[N\]. \[Title\]. Estimated time: \[M\] minutes."  
* **Queueing:** This audio segment must be injected into the playback queue *immediately before* the first sentence of the chapter text.  
* **Voice Consistency:** The announcer should ideally use the "Narrator" voice to maintain consistency.

**Technical Implementation:**

* Listen to onChapterChange events in AudioPlayerService.  
* Synthesize the announcement using the currently selected voice.  
* Calculate M (minutes) based on chapterWordCount / userSpeed (defaulting to 150wpm if unknown).  
* **UI Indication:** Show a visual "Announcing..." toast or state in the player while the pre-roll is playing.

# **Feature Request: Narrative Voice Switching (Simple Actor Engine)**

Priority: Medium  
Component: lib/tts  
Rationale:  
Monotone narration makes long dialogue-heavy sections difficult to follow. Distinguishing between "Narrator" and "Character" voices aids comprehension and reduces fatigue. Using a subtle pitch shift or a different voice model clarifies who is speaking without requiring "he said/she said" tags.  
User Story:  
As a listener, I want dialogue inside quotation marks to be spoken by a slightly different voice (or pitch) so I can easily distinguish characters from narration.  
**Acceptance Criteria:**

* **Detection:** Identify text enclosed in standard quote marks ("", “”, '').  
* **Configuration:** Allow user to select a "Narrator Voice" and a "Dialogue Voice" (e.g., Google WaveNet-A vs WaveNet-B).  
* **Performance:** The switching must not introduce significant latency (gaps) between narration and dialogue.  
* **Fallback:** If only one voice is available/configured, proceed without switching.

**Technical Implementation:**

* Update TextSegmenter to tag segments with type: 'NARRATION' | 'DIALOGUE'.  
* Update TTSProvider payload construction to check the segment type and swap the voiceId accordingly.  
* **Optimization:** Batch contiguous dialogue segments into a single API call to reduce latency and costs.  
* **Caching:** Ensure both voices are cached effectively to prevent "loading pauses" when switching actors.

# **Feature Request: Intelligent Silence Trimming ("Smart Speed")**

Priority: Medium (Quality of Life)  
Component: lib/tts/dsp  
Rationale:  
TTS generation often results in awkward, robotic pauses (1-2s) or rushed headers. Standard "2x speed" simply speeds up everything, distorting pitch. Trimming silence creates a tighter, podcast-like cadence without altering the voice quality. It saves time and increases energy.  
User Story:  
As a listener, I want the app to automatically shorten long silences between sentences so that the pacing feels energetic and natural.  
**Acceptance Criteria:**

* **Analysis:** The system must detect silence windows (\>300ms, amplitude \< 0.01) in the decoded AudioBuffer.  
* **Action:** The system must slice out the excess silence, clamping it to a maximum of 200ms.  
* **Smoothness:** The cut points must be at zero-crossings or cross-faded (1-2ms) to prevent audible "pops" or "clicks".  
* **Setting:** User can toggle "Smart Speed" On/Off in Audio Settings.

**Technical Implementation:**

* Create src/lib/tts/dsp/SilenceTrimmer.ts.  
* Process the AudioBuffer immediately after decoding in HybridAudioPlayer.  
* Iterate through Float32Array channel data to identify silence ranges.  
* Construct a new, compacted AudioBuffer.  
* **Performance:** Consider offloading to a Web Worker for large buffers to prevent UI frame drops.  
* **Edge Case:** Do not trim silence inside the "Pre-roll" or "Ambient" tracks.

# **Feature Request: Ambient Soundscapes (Background Mixing)**

Priority: Low  
Component: lib/tts, public/assets  
Rationale:  
Pure TTS in a quiet room can feel stark and lonely. Background ambience masks digital artifacts (hiss/crackle) and increases user comfort during long sessions. It can also mask the tiny silences between TTS segments.  
User Story:  
As a user, I want to play looped environmental sounds (rain, white noise) behind the narration to create a relaxing reading atmosphere.  
**Acceptance Criteria:**

* **Assets:** Include 3-4 loopable tracks (Rain, Fire, Cafe, Brown Noise).  
* **Mixing:** Playback must be independent of the TTS track (continues during pauses if configured, or pauses with TTS).  
* **Seamless Looping:** The background tracks must be perfectly seamless (zero-crossing loops) to prevent repetitive clicks.  
* **Ducking (Optional):** Option to slightly lower ambience volume when speech is active (Side-chain compression).  
* **Controls:** Separate volume slider for "Ambience".  
* **State:** Persist selection and volume across sessions.

**Technical Implementation:**

* Load ambient file into an AudioBuffer.  
* Create AudioBufferSourceNode with loop \= true.  
* Connect to AmbienceGainNode (from the Audio Pipeline) \-\> MasterGain.  
* Ensure the ambient loop is managed (started/stopped) alongside the WebAudioEngine state changes.

# **Feature Request: Smart Resume ("Recall" Buffer)**

Priority: High  
Component: AudioPlayerService  
Rationale:  
Context loss is high in audiobooks. Resuming at the exact millisecond after a 24-hour break leaves the user disoriented. A "Smart Resume" feature mimics natural cognitive recall needs by rewinding just enough to remind the user of the context.  
User Story:  
As a listener, I want the book to rewind slightly when I resume playback, with the rewind amount depending on how long I've been away, so I can regain context.  
**Acceptance Criteria:**

* **Short Pause (\< 5 min):** Resume instantly.  
* **Medium Pause (5 min \- 24 hours):** Rewind 10 seconds (or to the start of the current sentence).  
* **Long Pause (\> 24 hours):** Rewind 60 seconds (or to the start of the previous paragraph).  
* **Feedback:** Visual or auditory cue that a rewind has occurred (e.g., "Rewinding 1 minute...").

**Technical Implementation:**

* Store lastPauseTimestamp in localStorage via useTTSStore.  
* On resume():  
  * Calculate delta \= Date.now() \- lastPauseTimestamp.  
  * Execute logic to modify currentSentenceIndex or currentTime before scheduling the first buffer.  
  * If rewinding crosses a chapter boundary, handle the chapter load gracefully.

# **Feature Request: Sleep Timer (Fade Out)**

Priority: High  
Component: AudioPlayerService  
Rationale:  
Sudden silence when a sleep timer expires can startle a user awake. A gradual fade-out mimics natural drifting off and prevents the "abrupt stop" wake-up effect. It ensures the transition to sleep is seamless.  
User Story:  
As a bedtime reader, I want the audio to fade out slowly over the last minute of the sleep timer so I am not woken up when it stops.  
**Acceptance Criteria:**

* **Options:** 15m, 30m, 45m, "End of Chapter".  
* **Behavior:** Audio volume ramps linearly from User Volume to 0.0 over the final 60 seconds.  
* **Shake-to-Extend:** (Optional) Detecting a phone shake during the fade-out extends the timer by 15 minutes.  
* **Completion:** Pause playback and reset volume to normal for the next session.

**Technical Implementation:**

* Use AudioParam.linearRampToValueAtTime() on the MasterGainNode.  
* Start ramp at timerDuration \- 60s.  
* Trigger pause() callback at timerDuration and cancel the ramp/reset gain.  
* **UI:** Show a countdown timer in the player UI when active.

# **Feature Request: Media Session Integration (Lock Screen Controls)**

Priority: Critical (Usability)  
Component: MediaSessionManager  
Rationale:  
Users primarily listen on mobile devices with screens locked. Without MediaSession integration, OS controls (Lock Screen, Control Center, Smart Watch) do not work, forcing the user to unlock the phone for every interaction. This is a baseline expectation for any audio app.  
User Story:  
As a mobile user, I want to play, pause, and skip tracks using my phone's lock screen or headphones so I don't have to look at the screen.  
**Acceptance Criteria:**

* **Metadata:** Lock screen displays Book Title, Chapter Name, and Cover Art.  
* **Art Scaling:** Ensure cover art is resized to optimal OS dimensions (e.g., 512x512) to prevent low-res blurring.  
* **Actions:**  
  * Play / Pause  
  * Seek Backward (-15s)  
  * Seek Forward (+15s)  
  * Next Track (Next Paragraph)  
  * Prev Track (Prev Paragraph)  
* **Sync:** Updates immediately when the book/chapter changes.

**Technical Implementation:**

* Create src/lib/tts/MediaSessionManager.ts.  
* Interact with navigator.mediaSession.  
* Map setActionHandler('play', ...) to useTTSStore.getState().resume().  
* Map setActionHandler('seekbackward', ...) to logic: if (time \> 15s) restart else prevSentence.  
* **Browser Compat:** Handle cases where mediaSession is undefined (desktop Firefox/Safari).

# **Feature Request: Car Mode UI**

Priority: Medium (Safety)  
Component: ReaderView  
Rationale:  
Standard UI elements (small buttons, menus) are dangerous to use while driving. A dedicated mode with massive touch targets and high contrast is a safety requirement for commuters. It reduces cognitive load and visual distraction.  
User Story:  
As a driver, I want a simplified interface with massive buttons and high contrast so I can control playback without taking my eyes off the road.  
**Acceptance Criteria:**

* **Activation:** Manual toggle in settings or "Car" icon in the reader.  
* **Design:** OLED Black background (\#000000). High contrast white text.  
* **Accessibility:** Buttons must meet AAA contrast ratios.  
* **Layout:**  
  * Top Left (50%): Rewind 30s.  
  * Top Right (50%): Forward 30s.  
  * Bottom (50%): Play/Pause (Spans full width).  
* **Restrictions:** Disable scrolling, library access, and settings in this mode.

**Technical Implementation:**

* Create a new Route or Modal view: /reader/car-mode.  
* Use CSS Grid vh units to ensure buttons fill 100% of the viewport.  
* Implement navigator.wakeLock to prevent screen sleep while in Car Mode.  
* **Orientation:** Force Portrait mode if possible (or adapt layout to Landscape grid).

# **Feature Request: Gesture Pad Overlay**

Priority: Low (Delight)  
Component: ReaderView  
Rationale:  
Locating specific buttons while walking, jogging, or in low light is difficult. Gestures are more forgiving than specific touch targets. They allow "blind" interaction.  
User Story:  
As a runner, I want to control playback by tapping or swiping anywhere on the screen so I don't have to look at my phone.  
**Acceptance Criteria:**

* **Single Tap:** Toggle Play/Pause.  
* **Double Tap (Left):** Rewind / Prev Sentence.  
* **Double Tap (Right):** Forward / Next Sentence.  
* **Two-finger Slide (Vertical):** Adjust playback speed or volume.  
* **Visual Feedback:** Show a ripple or icon overlay when a gesture is recognized.  
* **Conflict:** Ensure this mode is togglable so it doesn't break text selection.

**Technical Implementation:**

* Overlay a transparent div (z-index: 50\) over the text area.  
* Use a gesture library (like use-gesture or hammer.js) or custom touchstart/touchend heuristics to detect patterns.  
* **Haptics:** Trigger navigator.vibrate(50) on successful gesture recognition.

# **Feature Request: Export to MP3 (Offline-er Mode)**

Priority: Low  
Component: Library, TTS  
Rationale:  
Users may want to listen on "dumb" devices (Garmin watches, old MP3 players) that cannot run the PWA. Since we already generate the audio, allowing an export adds significant value and data portability.  
User Story:  
As a user, I want to download the current chapter as a single MP3 file so I can listen to it on my offline music player.  
**Acceptance Criteria:**

* **Source:** Uses currently cached TTS segments (avoids regeneration costs).  
* **Output:** Single MP3 file named \[Book Title\] \- \[Chapter N\].mp3.  
* **Metadata:** Inject basic ID3 tags (Title, Artist, Album) if possible.  
* **Constraint:** If segments are missing from cache, warn user about potential data usage/generation time.  
* **Progress:** Show a progress bar during the stitching/encoding process.

**Technical Implementation:**

* Fetch all AudioBuffers for the target chapter.  
* Calculate total duration.  
* Create a destination AudioBuffer.  
* Copy individual segment data into the destination buffer (offset by accumulated duration).  
* Encode to WAV (simple) or MP3 (via lamejs WASM) and trigger a browser download.

# **Feature Request: Earcon Feedback (Audio Cues)**

Priority: Low (Delight)  
Component: lib/tts  
Rationale:  
When using headphones, Car Mode, or gestures, users often cannot see the screen to confirm an action registered. Subtle audio cues provide necessary confirmation, reducing the "did I press it?" anxiety.  
User Story:  
As a user, I want to hear a subtle beep when I skip a track or pause, so I know my command was received without looking at the device.  
**Acceptance Criteria:**

* **Assets:** Short \<200ms beeps (High blip for "Skip Forward", Low blip for "Skip Back", Soft click for "Pause").  
* **Trigger:** Fire on any control interaction when "Car Mode" or "Headphones" (if detectable) are active.  
* **Mixing:** These sounds should mix over the TTS/Ambience without stopping them.  
* **Volume:** Earcons should be played at a fixed volume relative to the Master, not affected by Voice Volume.

**Technical Implementation:**

* Store Earcons as base64 strings or cached assets.  
* Create a utility function playEarcon(type) in WebAudioEngine.  
* Connect Earcon source to MasterGain.  
* **Rate Limit:** Prevent spamming earcons if the user taps rapidly (debounce).
