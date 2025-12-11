# Gen AI Foundations & Features Design Document

## 1. Introduction
The goal of this document is to outline the architecture and implementation plan for integrating Generative AI (specifically **Gemini 2.5 Flash-Lite**) into Versicle. This integration will enable advanced features such as:
1.  **Smarter Synthetic Table of Contents (TOC):** Generating descriptive chapter titles from content.
2.  **Structural Annotation:** Analyzing chapters to identify structure (Title, Body, Footnotes) for better rendering and navigation.
3.  **Pronunciation Guide:** Generating phonetic rules for unusual words using the existing Lexicon system.

This design emphasizes a **modular approach**, ensuring that AI features are enhancements that do not disrupt the core "Local-First" and offline capabilities of the application.

## 2. Architecture

### 2.1 GenAI Service (`src/lib/genai/`)
A new singleton service, `GenAIService`, will encapsulate all interactions with the LLM provider.

*   **Responsibilities:**
    *   Managing API keys and model configuration.
    *   Constructing prompts (likely using structured prompting for JSON output).
    *   Handling rate limiting and error states.
    *   Abstracting the specific provider (Google Generative AI) to allow future extensibility.

```typescript
// Proposed Interface
interface GenAIProvider {
  generateContent(prompt: string): Promise<string>;
  generateJSON<T>(prompt: string, schema?: any): Promise<T>;
}

class GenAIService {
  // ... singleton logic
  configure(apiKey: string, model: string): void;
  generateTOC(chapterText: string): Promise<string>;
  analyzeChapterStructure(text: string): Promise<ChapterStructure>;
  generatePronunciationRules(text: string): Promise<LexiconRule[]>;
}
```

### 2.2 State Management (`src/store/useGenAIStore.ts`)
A new Zustand store will manage the configuration and state of AI features.

*   **State:**
    *   `apiKey`: string (Persistent).
    *   `model`: string (Default: "gemini-2.5-flash-lite").
    *   `isEnabled`: boolean.
    *   `usageStats`: { totalTokens: number, estimatedCost: number }.

### 2.3 UI Components (`src/components/ui/GlobalSettingsDialog.tsx`)
The `GlobalSettingsDialog` will be updated to include a new **"Generative AI"** tab.
*   **Fields:**
    *   Enable/Disable toggle.
    *   API Key input.
    *   Model selection (Dropdown).

## 3. Data Model Changes
To persist the results of AI analysis without cluttering the core metadata, we will introduce new object stores or expand existing ones in IndexedDB (`src/types/db.ts`).

### 3.1 Content Analysis Store
We will store structural analysis per section.

```typescript
interface ContentAnalysis {
  id: string; // composite bookId-sectionId
  bookId: string;
  sectionId: string;
  structure: {
    titleRange: { start: number, end: number }; // Index in raw text
    bodyRange: { start: number, end: number };
    footnotes: Array<{ id: string, start: number, end: number, text: string }>;
  };
  summary?: string;
  lastAnalyzed: number;
}
```

### 3.2 Book Metadata
We will update `BookMetadata` to include a flag or status for AI processing.

```typescript
interface BookMetadata {
  // ... existing fields
  aiAnalysisStatus?: 'none' | 'partial' | 'complete';
}
```

## 4. Feature Specifications

### 4.1 Smarter Synthetic TOC
*   **Current State:** `processEpub` uses naive DOM parsing to find `<h1>` tags or the first few lines of text. This often results in "Chapter 1", "Chapter 2", etc., or noisy titles.
*   **AI Implementation:**
    1.  **Trigger:** User clicks "Enhance TOC" in the TOC sidebar or Library view.
    2.  **Process:**
        *   Iterate through `BookMetadata.syntheticToc`.
        *   For each item, fetch the first ~500-1000 characters of the referenced section using `epub.js` or direct DB access.
        *   **Prompt:** "Given the following opening text of a book chapter, generate a concise and descriptive title (max 6 words). Return JSON."
        *   Update `syntheticToc` in the database.
    3.  **UI:** Show a loading indicator during processing.

### 4.2 Structural Annotation (Header, Body, Footer)
*   **Goal:** Identify the semantic parts of a chapter.
*   **AI Implementation:**
    1.  **Trigger:** "Analyze Chapter" action in Reader or "Analyze Book" in Library.
    2.  **Process:**
        *   Extract the full text of the section.
        *   **Prompt:** "Analyze the following chapter text. Identify the character ranges (start, end) for the Chapter Title, the Main Body, and any Footnotes/Endnotes. Return JSON."
        *   Validate ranges against the original text length.
        *   Save to `ContentAnalysis` store.
    3.  **UI:** The `ReaderView` can query this store to:
        *   Hide/Style the title differently.
        *   Make footnotes interactive (popups) instead of jumps.

### 4.3 Pronunciation Guide
*   **Goal:** Improve TTS quality for fantasy/sci-fi or foreign names.
*   **AI Implementation:**
    1.  **Trigger:** "Generate Pronunciation Guide" in the Lexicon Manager.
    2.  **Process:**
        *   Scan the book text (or a sample of likely proper nouns using a regex for capitalized words).
        *   **Prompt:** "Identify unusual proper nouns, fictional names, or foreign words in this list. For each, provide a phonetic respelling or IPA for an English Text-to-Speech engine. Return JSON: `[{ original: '...', replacement: '...' }]`".
        *   Convert the result into `LexiconRule` objects.
        *   Save using `LexiconService.saveRule`.
    3.  **UI:** The user sees the new rules in the Lexicon Manager and can edit/delete them.

## 5. Implementation Roadmap

### Phase 1: Foundation
1.  Add `@google/generative-ai` dependency.
2.  Create `src/store/useGenAIStore.ts`.
3.  Implement `src/lib/genai/GenAIService.ts` with basic text generation.
4.  Update `GlobalSettingsDialog` to allow inputting API key.

### Phase 2: Data & Ingestion
1.  Update `src/types/db.ts` and `src/db/DBService.ts` to support `ContentAnalysis`.
2.  Implement helper functions to extract raw text from `epub.js` items efficiently.

### Phase 3: Feature Implementation
1.  **Smart TOC:** Implement the "Enhance TOC" workflow. Connect it to the TOC UI.
2.  **Pronunciation:** Implement the "Generate Guide" workflow. Connect it to `LexiconService`.
3.  **Structure:** Implement the analysis logic and update `ReaderView` to utilize the data (experimental).

### Phase 4: Verification & Polish
1.  Add error handling (invalid API key, quota exceeded).
2.  Add progress indicators for long-running AI tasks.
3.  Write tests for prompt construction and JSON parsing.

## 6. Security & Privacy
*   **User Keys:** API keys are stored in `localStorage` (via Zustand) and only used for direct requests to the AI provider. They are never sent to a Versicle server (Versicle is local-first).
*   **Data Usage:** Content sent to the LLM is subject to the provider's data policy. We must add a disclaimer that "Using AI features sends book content to Google/Provider".
