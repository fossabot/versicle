import { create } from 'zustand';
import { dbService } from '../db/DBService';
import type { BookMetadata } from '../types/db';
import { StorageFullError } from '../types/errors';

/**
 * State interface for the Library store.
 */
interface LibraryState {
  /** List of book metadata currently in the library. */
  books: BookMetadata[];
  /** Flag indicating if the library is currently loading. */
  isLoading: boolean;
  /** Flag indicating if a book is currently being imported. */
  isImporting: boolean;
  /** Error message if an operation failed, or null. */
  error: string | null;
  /**
   * Fetches all books from the database and updates the store.
   */
  fetchBooks: () => Promise<void>;
  /**
   * Imports a new EPUB file into the library.
   * @param file - The EPUB file to import.
   */
  addBook: (file: File) => Promise<void>;
  /**
   * Removes a book and its associated data (files, annotations) from the library.
   * @param id - The unique identifier of the book to remove.
   */
  removeBook: (id: string) => Promise<void>;

  /**
   * Offloads the binary file of a book to save space, retaining metadata.
   * @param id - The unique identifier of the book to offload.
   */
  offloadBook: (id: string) => Promise<void>;

  /**
   * Restores the binary file of an offloaded book.
   * @param id - The unique identifier of the book to restore.
   * @param file - The EPUB file to upload.
   */
  restoreBook: (id: string, file: File) => Promise<void>;
}

/**
 * Zustand store for managing the user's library of books.
 * Handles fetching, adding, and removing books from IndexedDB.
 */
export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  isLoading: false,
  isImporting: false,
  error: null,

  fetchBooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const books = await dbService.getLibrary();
      set({ books, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch books:', err);
      set({ error: 'Failed to load library.', isLoading: false });
    }
  },

  addBook: async (file: File) => {
    set({ isImporting: true, error: null });
    try {
      await dbService.addBook(file);
      // Refresh library
      await get().fetchBooks();
      set({ isImporting: false });
    } catch (err) {
      console.error('Failed to import book:', err);
      let errorMessage = 'Failed to import book.';
      if (err instanceof StorageFullError) {
          errorMessage = 'Device storage full. Please delete some books.';
      }
      set({ error: errorMessage, isImporting: false });
    }
  },

  removeBook: async (id: string) => {
    try {
      await dbService.deleteBook(id);
      await get().fetchBooks();
    } catch (err) {
      console.error('Failed to remove book:', err);
      set({ error: 'Failed to remove book.' });
    }
  },

  offloadBook: async (id: string) => {
    try {
      const db = await getDB();
      const tx = db.transaction(['books', 'files'], 'readwrite');
      const bookStore = tx.objectStore('books');
      const book = await bookStore.get(id);

      if (!book) throw new Error('Book not found');

      // If missing hash, calculate it from existing file before deleting
      if (!book.fileHash) {
        const fileStore = tx.objectStore('files');
        const arrayBuffer = await fileStore.get(id);
        if (arrayBuffer) {
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          book.fileHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        }
      }

      book.isOffloaded = true;
      await bookStore.put(book);
      await tx.objectStore('files').delete(id);
      await tx.done;

      await get().fetchBooks();
    } catch (err) {
      console.error('Failed to offload book:', err);
      set({ error: 'Failed to offload book.' });
    }
  },

  restoreBook: async (id: string, file: File) => {
    set({ isImporting: true, error: null });
    try {
      const db = await getDB();
      const book = await db.get('books', id);

      if (!book) throw new Error('Book not found');
      if (!book.fileHash) throw new Error('Cannot verify file (missing hash).');

      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      if (fileHash !== book.fileHash) {
        throw new Error('File verification failed: Checksum mismatch.');
      }

      const tx = db.transaction(['books', 'files'], 'readwrite');
      await tx.objectStore('files').put(arrayBuffer, id);

      book.isOffloaded = false;
      await tx.objectStore('books').put(book);
      await tx.done;

      await get().fetchBooks();
      set({ isImporting: false });
    } catch (err) {
      console.error('Failed to restore book:', err);
      // Ensure we expose the error message to the UI
      set({ error: err instanceof Error ? err.message : 'Failed to restore book.', isImporting: false });
    }
  },
}));
