
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeCfiRanges, parseCfiRange, generateCfiRange } from './cfi-utils';

// Mock epubjs
vi.mock('epubjs', () => {
  return {
    default: {
      CFI: class MockCFI {
        compare(a: string, b: string) {
            if (a === b) return 0;
            return a < b ? -1 : 1;
        }
      }
    }
  };
});

describe('cfi-utils', () => {
    describe('parseCfiRange', () => {
        it('parses a valid CFI range', () => {
            // Correct CFI range format: epubcfi(parent,start,end)
            const range = 'epubcfi(/6/14!/4/2/1,:0,:10)';
            const parsed = parseCfiRange(range);
            expect(parsed).not.toBeNull();
            expect(parsed?.parent).toBe('/6/14!/4/2/1');
            expect(parsed?.start).toBe(':0');
            expect(parsed?.end).toBe(':10');
            expect(parsed?.fullStart).toBe('epubcfi(/6/14!/4/2/1:0)');
            expect(parsed?.fullEnd).toBe('epubcfi(/6/14!/4/2/1:10)');
        });

        it('returns null for invalid CFI range', () => {
            expect(parseCfiRange('invalid')).toBeNull();
            // Missing parts
            expect(parseCfiRange('epubcfi(/a,/b)')).toBeNull();
        });
    });

    describe('generateCfiRange', () => {
        it('generates a CFI range from two CFIs', () => {
            const start = 'epubcfi(/6/14!/4/2/1:0)';
            const end = 'epubcfi(/6/14!/4/2/1:10)';
            const range = generateCfiRange(start, end);

            // Based on implementation behavior:
            // Common: /6/14!/4/2/1
            // StartRel: :0
            // EndRel: :10
            expect(range).toBe('epubcfi(/6/14!/4/2/1,:0,:10)');
        });
    });

    describe('mergeCfiRanges', () => {
        it('merges overlapping ranges', () => {
            // Using lexicographically sortable numbers for the mock string comparator
            // 10 < 20 (lexicographically '1' < '2')
            // Range 1: 10 to 30
            // Range 2: 20 to 40

            // fullStart 1: ...:10
            // fullEnd 1:   ...:30
            // fullStart 2: ...:20
            // fullEnd 2:   ...:40

            // Check overlap: next.start (20) <= current.end (30). '2' < '3'. True.

            const range1 = 'epubcfi(/6/14!/4/2/1,:10,:30)';
            const range2 = 'epubcfi(/6/14!/4/2/1,:20,:40)';

            const result = mergeCfiRanges([range1], range2);

            expect(result).toHaveLength(1);
            // Result should cover 10 to 40
            expect(result[0]).toBe('epubcfi(/6/14!/4/2/1,:10,:40)');
        });

        it('keeps disjoint ranges separate', () => {
            // Range 1: 10 to 20
            // Range 2: 30 to 40
            // Overlap check: 30 <= 20. '3' <= '2'. False.

            const range1 = 'epubcfi(/6/14!/4/2/1,:10,:20)';
            const range2 = 'epubcfi(/6/14!/4/2/1,:30,:40)';

            const result = mergeCfiRanges([range1], range2);

            expect(result).toHaveLength(2);
            expect(result[0]).toBe(range1);
            expect(result[1]).toBe(range2);
        });

         it('merges adjacent ranges', () => {
             // Range 1: 10 to 20
             // Range 2: 20 to 30
             // Overlap check: 20 <= 20. True.

            const range1 = 'epubcfi(/6/14!/4/2/1,:10,:20)';
            const range2 = 'epubcfi(/6/14!/4/2/1,:20,:30)';

            const result = mergeCfiRanges([range1], range2);
            expect(result).toHaveLength(1);
            expect(result[0]).toBe('epubcfi(/6/14!/4/2/1,:10,:30)');
        });

        it('merges contained ranges', () => {
            // Range 1: 10 to 40
            // Range 2: 20 to 30
            // Overlap: 20 <= 40. True.
            // Merge end: Max(40, 30) -> 40.

            const range1 = 'epubcfi(/6/14!/4/2/1,:10,:40)';
            const range2 = 'epubcfi(/6/14!/4/2/1,:20,:30)';

            const result = mergeCfiRanges([range1], range2);
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(range1);
        });
    });
});
