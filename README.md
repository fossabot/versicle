# Versicle

**Versicle** is a web-based, local-first EPUB manager and reader Progressive Web App (PWA). It is designed to provide a robust reading experience directly in the browser, leveraging **epub.js** for rendering and **IndexedDB** for offline storage of books and metadata.

## Features

*   **Local-First:** All data (books, metadata, annotations) is stored locally in your browser using IndexedDB. No server required for file storage.
*   **EPUB Rendering:** High-fidelity rendering of EPUB files using `epub.js`.
*   **Library Management:** Manage your collection with covers, sorting, and filtering.
*   **Text-to-Speech (TTS):** Synchronized TTS with visual sentence highlighting.
*   **Annotations:** Highlight text and save notes (persisted via CFIs).
*   **Search:** Full-text search within books using FlexSearch (in a Web Worker).
*   **PWA:** Installable on supported devices for a native-like experience.

## Tech Stack

*   **Frontend:** React 18+, TypeScript, Vite
*   **State Management:** Zustand
*   **Routing:** React Router DOM
*   **Rendering Engine:** epub.js
*   **Database:** IndexedDB (via `idb`)
*   **Styling:** CSS Modules / Tailwind (TBD based on implementation)
*   **Testing:** Vitest / Playwright (TBD)

## Setup & Development

### Prerequisites

*   Node.js v18+
*   npm v9+

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

To start the development server:

```bash
npm run dev
```

### Building for Production

To create a production build:

```bash
npm run build
```

### Linting

To run the linter:

```bash
npm run lint
```

## Architecture Overview

*   **`src/components/library`**: Components for the book grid, file upload, and library management.
*   **`src/components/reader`**: The main reading interface, wrapping the `epub.js` Rendition object.
*   **`src/db`**: Database configuration and API wrapper for IndexedDB.
*   **`src/store`**: Global state management (Zustand) for library and reader states.
*   **`src/lib`**: Utility functions and helpers.

## License

[MIT](LICENSE)
