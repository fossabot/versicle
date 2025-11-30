import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LexiconService } from './LexiconService';
import { getDB } from '../../db/db';

// Mock getDB
vi.mock('../../db/db', () => ({
  getDB: vi.fn(),
}));

describe('LexiconService', () => {
  let service: LexiconService;
  let mockDB: any;

  beforeEach(() => {
    // Reset instance between tests if possible, or just treat as singleton
    // Since it's a singleton, we need to be careful.
    // However, the state is in DB, which is mocked.
    service = LexiconService.getInstance();

    mockDB = {
      getAll: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    (getDB as any).mockResolvedValue(mockDB);
  });

  describe('applyLexicon', () => {
    it('should replace text according to rules', () => {
      const rules = [
        { id: '1', original: 'Cthulhu', replacement: 'Kuh-thoo-loo', created: 0 },
        { id: '2', original: 'Hermione', replacement: 'Her-my-oh-nee', created: 0 }
      ];

      const text = 'Cthulhu called Hermione.';
      const result = service.applyLexicon(text, rules);

      expect(result).toBe('Kuh-thoo-loo called Her-my-oh-nee.');
    });

    it('should be case insensitive for matching but preserve case of replacement', () => {
       const rules = [
        { id: '1', original: 'cat', replacement: 'Feline', created: 0 }
       ];

       const text = 'The Cat sat on the cat.';
       const result = service.applyLexicon(text, rules);

       expect(result).toBe('The Feline sat on the Feline.');
    });

    it('should handle special regex characters in original text', () => {
        const rules = [
            { id: '1', original: 'C++', replacement: 'C Plus Plus', created: 0 }
        ];
        const text = 'I love C++.';
        const result = service.applyLexicon(text, rules);
        expect(result).toBe('I love C Plus Plus.');
    });

    it('should prioritize longer matches', () => {
        // If we didn't sort, "Super" might replace the start of "Superman" if not using \b,
        // but \b handles "Superman" vs "Super" correctly.
        // Let's try something where one is substring of another without boundaries being enough?
        // Actually \b is robust. But let's verify sorting works for non-boundary cases if we were to support them.
        // With \b, "Super" won't match "Superman".
        // Let's try: "Dr." vs "Dr. Dre" - "Dr." has boundary after .

        const rules = [
            { id: '1', original: 'New York', replacement: 'NY', created: 0 },
            { id: '2', original: 'New', replacement: 'Old', created: 0 }
        ];

        const text = 'I live in New York.';
        const result = service.applyLexicon(text, rules);

        // If "New" is replaced first -> "I live in Old York." -> "Old York" doesn't match "New York".
        // If "New York" is replaced first -> "I live in NY."

        expect(result).toBe('I live in NY.');
    });
  });

  describe('getRulesHash', () => {
      it('should generate a consistent hash for the same rules', async () => {
          const rules = [
              { id: '1', original: 'A', replacement: 'B', created: 0 },
              { id: '2', original: 'C', replacement: 'D', created: 0 }
          ];

          const hash1 = await service.getRulesHash(rules);
          const hash2 = await service.getRulesHash([...rules].reverse()); // Order shouldn't matter as service sorts

          expect(hash1).toBe(hash2);
          expect(hash1).toBeTruthy();
      });

      it('should return empty string for no rules', async () => {
          const hash = await service.getRulesHash([]);
          expect(hash).toBe('');
      });
  });
});
