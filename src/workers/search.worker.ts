import { SearchEngine } from '../lib/search-engine';

/**
 * Defines the structure of messages sent to the search worker.
 */
export type SearchMessage =
  | { type: 'INDEX_BOOK'; payload: { bookId: string; sections: { id: string; href: string; text: string }[] } }
  | { type: 'INIT_INDEX'; payload: { bookId: string } }
  | { type: 'ADD_TO_INDEX'; payload: { bookId: string; sections: { id: string; href: string; text: string }[] } }
  | { type: 'SEARCH'; id: string; payload: { query: string; bookId: string } };

const engine = new SearchEngine();

/**
 * Global message handler for the Web Worker.
 * Receives indexing and search commands and delegates them to the SearchEngine.
 *
 * @param e - The MessageEvent containing the command and payload.
 */
self.onmessage = async (e: MessageEvent<SearchMessage>) => {
  const { type, payload } = e.data;

  if (type === 'INDEX_BOOK') {
    const { bookId, sections } = payload;
    engine.indexBook(bookId, sections);
    self.postMessage({ type: 'INDEX_COMPLETE', bookId });
  }

  else if (type === 'INIT_INDEX') {
    const { bookId } = payload;
    engine.initIndex(bookId);
    // No response needed, but could acknowledge
  }

  else if (type === 'ADD_TO_INDEX') {
    const { bookId, sections } = payload;
    engine.addDocuments(bookId, sections);
    // Send progress or just acknowledge if needed?
    // Client manages progress for now.
  }

  else if (type === 'SEARCH') {
    const { id } = e.data;
    const { query, bookId } = payload;
    const results = engine.search(bookId, query);
    self.postMessage({ type: 'SEARCH_RESULTS', id, results });
  }
};
