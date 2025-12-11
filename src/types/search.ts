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

export type SearchRequestType =
    | 'INDEX_BOOK'
    | 'INIT_INDEX'
    | 'ADD_TO_INDEX'
    | 'FINISH_INDEXING'
    | 'SEARCH';

export type SearchResponseType =
    | 'ACK'
    | 'SEARCH_RESULTS'
    | 'ERROR';

export interface SearchSection {
    id: string;
    href: string;
    text: string;
}

export type SearchRequest =
  | { id: string; type: 'INDEX_BOOK'; payload: { bookId: string; sections: SearchSection[] } }
  | { id: string; type: 'INIT_INDEX'; payload: { bookId: string } }
  | { id: string; type: 'ADD_TO_INDEX'; payload: { bookId: string; sections: SearchSection[] } }
  | { id: string; type: 'FINISH_INDEXING'; payload: { bookId: string } }
  | { id: string; type: 'SEARCH'; payload: { query: string; bookId: string } };

export type SearchResponse =
  | { id: string; type: 'ACK' }
  | { id: string; type: 'SEARCH_RESULTS'; results: SearchResult[] }
  | { id: string; type: 'ERROR'; error: string };
