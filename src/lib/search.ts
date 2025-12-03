import type { Book } from 'epubjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents the result of a search query within a book.
 */
export interface SearchResult {
    /** The reference (href) to the location in the book. */
    href: string;
    /** A snippet of text containing the search term. */
    excerpt: string;
    /** Optional Canonical Fragment Identifier (CFI) for the location. */
    cfi?: string;
}

/**
 * Client-side handler for interacting with the search worker.
 * Manages off-main-thread indexing and searching of books.
 */
class SearchClient {
    private worker: Worker | null = null;
    private listeners: Map<string, (data: unknown) => void> = new Map();

    /**
     * Retrieves the existing Web Worker instance or creates a new one if it doesn't exist.
     *
     * @returns The active Search Web Worker.
     */
    private getWorker() {
        if (!this.worker) {
             this.worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
                type: 'module'
            });

            this.worker.onmessage = (e) => {
                const { type, id, results } = e.data;
                if (type === 'SEARCH_RESULTS' && id) {
                    const listener = this.listeners.get(id);
                    if (listener) listener(results);
                } else if (type === 'INDEX_COMPLETE') {
                    // Handle completion if needed
                }
            };
        }
        return this.worker;
    }

    /**
     * Extracts text content from a book's spine items and sends it to the worker for indexing.
     * Uses batch processing to avoid blocking the main thread.
     *
     * @param book - The epubjs Book object to be indexed.
     * @param bookId - The unique identifier of the book.
     * @param onProgress - Optional callback for indexing progress (0.0 to 1.0).
     * @returns A Promise that resolves when the indexing command is sent to the worker.
     */
    async indexBook(book: Book, bookId: string, onProgress?: (percent: number) => void) {
        // Init/Clear index
        this.getWorker().postMessage({ type: 'INIT_INDEX', payload: { bookId } });

        const spineItems = (book.spine as unknown as { items: unknown[] }).items;
        const total = spineItems.length;
        const BATCH_SIZE = 5;

        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = spineItems.slice(i, i + BATCH_SIZE);
            const sections: { id: string; href: string; text: string }[] = [];

            for (const item of batch) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const doc = await (book as any).load((item as any).href);
                    if (doc) {
                        const text = doc.body.innerText;
                        sections.push({
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            id: (item as any).id,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            href: (item as any).href,
                            text: text
                        });
                    }
                } catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    console.warn(`Failed to index section ${(item as any).href}`, e);
                }
            }

            if (sections.length > 0) {
                this.getWorker().postMessage({
                    type: 'ADD_TO_INDEX',
                    payload: { bookId, sections }
                });
            }

            if (onProgress) {
                onProgress(Math.min(1.0, (i + batch.length) / total));
            }

            // Yield to main thread
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Send a final complete message locally or rely on worker?
        // Worker sends INDEX_COMPLETE for INDEX_BOOK, but for incremental we might want to signal "done".
        // But the previous implementation just returned void.
        // We can just rely on the promise resolving here.
    }

    /**
     * Performs a search query against a specific book index via the worker.
     *
     * @param query - The text query to search for.
     * @param bookId - The unique identifier of the book to search.
     * @returns A Promise that resolves to an array of SearchResult objects.
     */
    search(query: string, bookId: string): Promise<SearchResult[]> {
        return new Promise((resolve) => {
            const id = uuidv4();
            this.listeners.set(id, (data) => {
                resolve(data as SearchResult[]);
                this.listeners.delete(id);
            });

            this.getWorker().postMessage({
                type: 'SEARCH',
                id,
                payload: { query, bookId }
            });
        });
    }

    /**
     * Terminates the search worker and cleans up resources.
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

/** A singleton instance of the SearchClient. */
export const searchClient = new SearchClient();
