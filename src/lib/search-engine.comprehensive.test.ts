import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from './search-engine';

describe('SearchEngine Comprehensive Tests', () => {
    let engine: SearchEngine;

    beforeEach(() => {
        engine = new SearchEngine();
    });

    it('should handle regex special characters in query', () => {
        const text = 'This has a (parenthesis) and a [bracket] and a {brace}.';
        const sections = [{ id: '1', href: 'chap1.html', text }];
        engine.indexBook('test-book', sections);

        let results = engine.search('test-book', '(parenthesis)');
        expect(results).toHaveLength(1);
        expect(results[0].excerpt).toContain('(parenthesis)');

        results = engine.search('test-book', '[bracket]');
        expect(results).toHaveLength(1);
        expect(results[0].excerpt).toContain('[bracket]');

        results = engine.search('test-book', '{brace}');
        expect(results).toHaveLength(1);
        expect(results[0].excerpt).toContain('{brace}');
    });

    it('should correctly handle matches at the very beginning', () => {
        const text = 'Start of the text.';
        const sections = [{ id: '1', href: 'start.html', text }];
        engine.indexBook('start', sections);
        const results = engine.search('start', 'Start');
        expect(results[0].excerpt.trim()).toMatch(/^Start/);
    });

    it('should correctly handle matches at the very end', () => {
        const text = 'End of the text';
        const sections = [{ id: '1', href: 'end.html', text }];
        engine.indexBook('end', sections);
        const results = engine.search('end', 'text');
        expect(results[0].excerpt).toContain('text');
        expect(results[0].excerpt.endsWith('text')).toBe(true);
    });

    it('should handle unicode characters that change length when lowercased', () => {
        // "İ" (U+0130) lowercases to "i̇" (U+0069 U+0307) which is length 2.
        const text = 'AİB matching text';
        const sections = [{ id: '1', href: 'unicode.html', text }];
        engine.indexBook('unicode', sections);

        const results = engine.search('unicode', 'matching');

        expect(results).toHaveLength(1);
        expect(results[0].excerpt).toContain('matching');
    });

    it('should handle large text without crashing', () => {
        const largeText = 'word '.repeat(10000) + 'TARGET ' + 'word '.repeat(10000);
        const sections = [{ id: '1', href: 'large.html', text: largeText }];
        engine.indexBook('large', sections);

        const start = performance.now();
        const results = engine.search('large', 'TARGET');
        const end = performance.now();

        expect(results).toHaveLength(1);
        expect(results[0].excerpt).toContain('TARGET');
        console.log(`Large text search excerpt generation took ${end - start}ms`);
    });

    it('should fallback gracefully if match not found in text', () => {
        // Scenario: FlexSearch matches a document because it contains the terms,
        // but the exact phrase query is not present as a contiguous string.
        // In this case, getExcerpt (which searches for the exact query string) will fail to find a match.
        // It should fallback to returning the beginning of the text.

        const text = 'The quick brown fox jumps over the lazy dog.';
        const sections = [{ id: '1', href: 'phrase.html', text }];
        engine.indexBook('phrase', sections);

        // Search for "fox dog". FlexSearch (default) treats this as "fox" OR "dog" (or AND),
        // so it matches the document.
        // But "fox dog" does not appear as a substring.
        const query = 'fox dog';
        const results = engine.search('phrase', query);

        expect(results).toHaveLength(1);
        // Excerpt should be the start of the text + "..."
        // text length is 44. Fallback is text.substring(0, 100) + '...'
        // But since text < 100, it returns text + '...'?
        // Logic: if (index === -1) return text.substring(0, 100) + '...';
        expect(results[0].excerpt).toBe(text + '...');
    });
});
