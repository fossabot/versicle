import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDB } from './db/db';
import { processEpub } from './lib/ingestion';
import { useLibraryStore } from './store/useLibraryStore';
import * as fs from 'fs';
import * as path from 'path';

// This is an integration test suite for the main features of the app.
// It uses the real DB (idb) and real ingestion logic.
// It mocks `useLibraryStore` by using the real store implementation but manually invoking actions.
// Since Zustand stores are global, we need to be careful with state reset.

describe('Feature Integration Tests', () => {
  beforeEach(async () => {
    // Clear DB
    const db = await getDB();
    const tx = db.transaction(['books', 'files', 'annotations'], 'readwrite');
    await tx.objectStore('books').clear();
    await tx.objectStore('files').clear();
    await tx.objectStore('annotations').clear();
    await tx.done;

    // Reset store state
    useLibraryStore.setState({ books: [], isLoading: false, isImporting: false, error: null });

    // Mock global fetch for cover extraction if needed (though we might use real file ingestion)
    global.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
            return Promise.resolve({
                blob: () => Promise.resolve(new Blob(['mock-cover'], { type: 'image/jpeg' })),
            } as Response);
        }
        return Promise.reject('Not mocked');
    });
  });

  it('should add a book, list it, and delete it (Library Management)', async () => {
    const store = useLibraryStore.getState();

    // 1. Add Book
    const fixturePath = path.resolve(__dirname, './test/fixtures/alice.epub');
    const buffer = fs.readFileSync(fixturePath);
    const file = new File([buffer], 'alice.epub', { type: 'application/epub+zip' });

    // Polyfill arrayBuffer if needed
    if (!file.arrayBuffer) {
        file.arrayBuffer = () => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    await store.addBook(file);

    // Verify state after adding
    const updatedStore = useLibraryStore.getState();
    expect(updatedStore.books).toHaveLength(1);
    expect(updatedStore.books[0].title).toContain("Alice's Adventures in Wonderland");
    expect(updatedStore.books[0].coverBlob).toBeDefined();

    // Verify DB
    const db = await getDB();
    const booksInDb = await db.getAll('books');
    expect(booksInDb).toHaveLength(1);
    const filesInDb = await db.getAll('files');
    expect(filesInDb).toHaveLength(1);

    // 2. Delete Book
    const bookId = updatedStore.books[0].id;
    await store.removeBook(bookId);

    // Verify state after deleting
    const finalStore = useLibraryStore.getState();
    expect(finalStore.books).toHaveLength(0);

    // Verify DB empty
    const booksInDbAfter = await db.getAll('books');
    expect(booksInDbAfter).toHaveLength(0);
    const filesInDbAfter = await db.getAll('files');
    expect(filesInDbAfter).toHaveLength(0);
  });

  it('should persist data across store reloads', async () => {
    // 1. Add data manually to DB to simulate previous session
    const db = await getDB();
    const bookId = 'test-id';
    await db.put('books', {
        id: bookId,
        title: 'Persisted Book',
        author: 'Me',
        addedAt: Date.now(),
    });

    // 2. Initialize store (fetchBooks)
    const store = useLibraryStore.getState();
    await store.fetchBooks();

    // 3. Verify store loaded data
    const updatedStore = useLibraryStore.getState();
    expect(updatedStore.books).toHaveLength(1);
    expect(updatedStore.books[0].title).toBe('Persisted Book');
  });

  it('should handle annotations (add, list, delete)', async () => {
    // Basic annotation test
    const db = await getDB();
    const bookId = 'book-1';

    // Create annotation
    const annotation = {
        id: 'ann-1',
        bookId,
        cfiRange: 'epubcfi(/6/4[chapter1]!/4/2/1:0)',
        text: 'Selected text',
        color: 'yellow',
        createdAt: Date.now()
    };

    const tx = db.transaction('annotations', 'readwrite');
    await tx.objectStore('annotations').add(annotation);
    await tx.done;

    // Verify retrieval
    const annotations = await db.getAllFromIndex('annotations', 'by_bookId', bookId);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe('Selected text');

    // Delete
    const tx2 = db.transaction('annotations', 'readwrite');
    await tx2.objectStore('annotations').delete('ann-1');
    await tx2.done;

    const annotationsAfter = await db.getAllFromIndex('annotations', 'by_bookId', bookId);
    expect(annotationsAfter).toHaveLength(0);
  });
});
