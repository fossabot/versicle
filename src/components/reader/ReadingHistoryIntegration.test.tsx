
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReadingHistoryPanel } from './ReadingHistoryPanel';
import { dbService } from '../../db/DBService';

// Mock DBService
vi.mock('../../db/DBService', () => ({
  dbService: {
    getReadingHistory: vi.fn(),
    updateReadingHistory: vi.fn().mockResolvedValue(undefined),
    saveProgress: vi.fn(),
    getBook: vi.fn(),
  }
}));

describe('ReadingHistory Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads and displays reading history in panel', async () => {
        const ranges = ['epubcfi(/6/14!/4/2/1:0)'];
        (dbService.getReadingHistory as any).mockResolvedValue(ranges);

        // We mock rendition as null to trigger the "Segment at..." fallback
        render(
           <ReadingHistoryPanel
               bookId="book1"
               rendition={null}
               onNavigate={vi.fn()}
           />
        );

        expect(screen.getByText('Loading history...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText('Loading history...')).not.toBeInTheDocument();
        });

        // With rendition=null, the "book" is null.
        // The code:
        // if (book) { ... }
        // else {
        //    // wait, if book is null, logic inside "if (book)" is skipped.
        //    // label = "Reading Segment"; percentage = 0; subLabel = range;
        // }
        // So we expect "Reading Segment" and the range as sublabel.

        expect(screen.getByText('Reading Segment')).toBeInTheDocument();
        expect(screen.getByText('epubcfi(/6/14!/4/2/1:0)')).toBeInTheDocument();
    });
});
