import { describe, it, expect } from 'vitest';
import { mergeCfiRanges, parseCfiRange, generateCfiRange } from './cfi-utils';

describe('cfi-utils', () => {
    describe('parseCfiRange', () => {
        it('should parse valid range', () => {
            const range = "epubcfi(/6/2!,/4/1:0,/4/1:100)";
            const parsed = parseCfiRange(range);
            expect(parsed).not.toBeNull();
            expect(parsed?.parent).toBe('/6/2!');
            expect(parsed?.start).toBe('/4/1:0');
            expect(parsed?.end).toBe('/4/1:100');
            expect(parsed?.fullStart).toBe('epubcfi(/6/2!/4/1:0)');
            expect(parsed?.fullEnd).toBe('epubcfi(/6/2!/4/1:100)');
        });

        it('should return null for invalid format', () => {
            expect(parseCfiRange("invalid")).toBeNull();
        });
    });

    describe('generateCfiRange', () => {
        it('should generate range from full CFIs', () => {
            const start = '/6/2!/4/1:0';
            const end = '/6/2!/4/1:100';
            const range = generateCfiRange(start, end);
            expect(range).toBe('epubcfi(/6/2!/4/1,:0,:100)');
            // Wait, logic might split at /4/1 if identical?
            // "i" stops at mismatch. Mismatch is at :0 vs :1.
            // i points to :
            // Backtrack: is : valid? Yes.
            // So common is /6/2!/4/1
        });

        it('should generate range with parent ending in !', () => {
             const start = '/6/2!/4/1:0';
             const end = '/6/2!/6/1:0';
             // Mismatch at /4 vs /6.
             // i points to / of /4.
             // Backtrack: / is valid.
             // Common: /6/2!
             const range = generateCfiRange(start, end);
             expect(range).toBe('epubcfi(/6/2!,/4/1:0,/6/1:0)');
        });
    });

    describe('mergeCfiRanges', () => {
        it('should merge overlapping ranges', () => {
            const r1 = "epubcfi(/6/2!,/4/1:0,/4/1:50)";
            const r2 = "epubcfi(/6/2!,/4/1:25,/4/1:100)";
            const merged = mergeCfiRanges([r1], r2);
            expect(merged.length).toBe(1);
            // Result should cover 0 to 100
            // Common parent might change if strict, but here parent is same.
            // /6/2!/4/1 :0 vs :100.
            expect(merged[0]).toContain(':0');
            expect(merged[0]).toContain(':100');
        });

        it('should merge adjacent ranges', () => {
             const r1 = "epubcfi(/6/2!,/4/1:0,/4/1:50)";
             const r2 = "epubcfi(/6/2!,/4/1:50,/4/1:100)";
             // Adjacent: end of r1 == start of r2.
             const merged = mergeCfiRanges([r1], r2);
             expect(merged.length).toBe(1);
             expect(merged[0]).toContain(':0');
             expect(merged[0]).toContain(':100');
        });

        it('should not merge disjoint ranges', () => {
            const r1 = "epubcfi(/6/2!,/4/1:0,/4/1:50)";
            const r2 = "epubcfi(/6/2!,/4/1:60,/4/1:100)";
            const merged = mergeCfiRanges([r1], r2);
            expect(merged.length).toBe(2);
        });
    });
});
