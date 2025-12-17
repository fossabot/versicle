
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbService } from './DBService';

// Mock getDB
const mockDB = {
    get: vi.fn(),
    put: vi.fn(),
    transaction: vi.fn(),
    getAll: vi.fn(),
};

vi.mock('./db', () => ({
    getDB: vi.fn(() => Promise.resolve(mockDB)),
}));

// Mock cfi-utils
vi.mock('../lib/cfi-utils', () => ({
    mergeCfiRanges: vi.fn((ranges, newRange) => {
        // Simple mock implementation
        if (newRange) return [...ranges, newRange];
        return ranges;
    }),
}));

describe('DBService Reading History', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getReadingHistory', () => {
        it('returns reading history ranges', async () => {
            const ranges = ['range1', 'range2'];
            mockDB.get.mockResolvedValue({ readRanges: ranges });

            const result = await dbService.getReadingHistory('book1');
            expect(result).toEqual(ranges);
            expect(mockDB.get).toHaveBeenCalledWith('reading_history', 'book1');
        });

        it('returns empty array if no history found', async () => {
            mockDB.get.mockResolvedValue(undefined);

            const result = await dbService.getReadingHistory('book1');
            expect(result).toEqual([]);
        });
    });

    describe('updateReadingHistory', () => {
        it('merges new range and updates DB', async () => {
            const bookId = 'book1';
            const newRange = 'range3';
            const existingRanges = ['range1', 'range2'];

            // Mock transaction
            const mockTx = {
                objectStore: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({ readRanges: existingRanges }),
                    put: vi.fn().mockResolvedValue(undefined),
                }),
                done: Promise.resolve(),
            };
            mockDB.transaction.mockReturnValue(mockTx);

            await dbService.updateReadingHistory(bookId, newRange);

            expect(mockDB.transaction).toHaveBeenCalledWith('reading_history', 'readwrite');
            // Check if put was called with updated ranges
            // Since we mocked mergeCfiRanges to just append, we expect [range1, range2, range3]
            const putArg = mockTx.objectStore().put.mock.calls[0][0];
            expect(putArg.bookId).toBe(bookId);
            expect(putArg.readRanges).toEqual(['range1', 'range2', 'range3']);
            expect(putArg.lastUpdated).toBeDefined();
        });

        it('creates new entry if none exists', async () => {
            const bookId = 'book1';
            const newRange = 'range1';

             // Mock transaction
            const mockTx = {
                objectStore: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(undefined),
                    put: vi.fn().mockResolvedValue(undefined),
                }),
                done: Promise.resolve(),
            };
            mockDB.transaction.mockReturnValue(mockTx);

            await dbService.updateReadingHistory(bookId, newRange);

            const putArg = mockTx.objectStore().put.mock.calls[0][0];
            expect(putArg.bookId).toBe(bookId);
            expect(putArg.readRanges).toEqual(['range1']);
        });
    });
});
