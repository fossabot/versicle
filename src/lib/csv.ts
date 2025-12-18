import type { ReadingListEntry } from '../types/db';

const HEADERS = {
    TITLE: 'Title',
    AUTHOR: 'Author',
    ISBN: 'ISBN',
    RATING: 'My Rating',
    SHELF: 'Exclusive Shelf',
    DATE_READ: 'Date Read',
    FILENAME: 'Filename',
    PERCENTAGE: 'Percentage'
};

export function exportReadingListToCSV(entries: ReadingListEntry[]): string {
    const headerRow = [
        HEADERS.TITLE,
        HEADERS.AUTHOR,
        HEADERS.ISBN,
        HEADERS.RATING,
        HEADERS.SHELF,
        HEADERS.DATE_READ,
        HEADERS.FILENAME,
        HEADERS.PERCENTAGE
    ].join(',');

    const rows = entries.map(entry => {
        const title = escapeCSV(entry.title);
        const author = escapeCSV(entry.author);
        // Clean ISBN if it has weird formatting, but usually just string.
        const isbn = entry.isbn ? `="${entry.isbn}"` : '';
        const rating = entry.rating || '';

        let shelf = 'to-read';
        if (entry.status) {
             shelf = entry.status;
        } else if (entry.percentage >= 0.98) {
             shelf = 'read';
        } else if (entry.percentage > 0) {
             shelf = 'currently-reading';
        }

        const dateRead = (shelf === 'read' && entry.lastUpdated) ? new Date(entry.lastUpdated).toISOString().split('T')[0] : '';
        const filename = escapeCSV(entry.filename);
        const percentage = entry.percentage.toFixed(4);

        return [
            title,
            author,
            isbn,
            rating,
            shelf,
            dateRead,
            filename,
            percentage
        ].join(',');
    });

    return [headerRow, ...rows].join('\n');
}

function escapeCSV(field: string): string {
    if (!field) return '';
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

export function parseReadingListCSV(csv: string): ReadingListEntry[] {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

    // Map headers to indices
    const indices: {[key: string]: number} = {};
    headers.forEach((h, i) => indices[h] = i);

    const getIdx = (key: string) => indices[key.toLowerCase()];

    const entries: ReadingListEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = parseCSVLine(line);

        if (values.length < 2) continue; // Skip empty/invalid lines

        // Extract fields
        const title = values[getIdx(HEADERS.TITLE)] || 'Unknown Title';
        const author = values[getIdx(HEADERS.AUTHOR)] || 'Unknown Author';
        // Remove =" and " wrapper if present for ISBN
        let isbn = values[getIdx(HEADERS.ISBN)];
        if (isbn) {
            isbn = isbn.replace(/^="|"$/g, '').replace(/"/g, '');
        }

        const filename = values[getIdx(HEADERS.FILENAME)];
        const percentageStr = values[getIdx(HEADERS.PERCENTAGE)];
        const shelf = values[getIdx(HEADERS.SHELF)];
        const dateRead = values[getIdx(HEADERS.DATE_READ)];
        const ratingStr = values[getIdx(HEADERS.RATING)];

        let finalFilename = filename;
        if (!finalFilename) {
             if (isbn) finalFilename = `isbn-${isbn}`;
             else finalFilename = `${title}-${author}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        }

        let percentage = 0;
        if (percentageStr) {
            percentage = parseFloat(percentageStr);
            if (percentage > 1.0 && percentage <= 100) percentage = percentage / 100;
        } else {
            if (shelf === 'read') percentage = 1.0;
        }

        let status: 'read' | 'currently-reading' | 'to-read' = 'to-read';
        if (shelf === 'read') status = 'read';
        else if (shelf === 'currently-reading') status = 'currently-reading';

        // Correct status based on percentage if shelf is missing or ambiguous
        if (!shelf) {
            if (percentage >= 0.98) status = 'read';
            else if (percentage > 0) status = 'currently-reading';
        }

        entries.push({
            filename: finalFilename,
            title,
            author,
            isbn,
            percentage,
            lastUpdated: dateRead ? new Date(dateRead).getTime() : Date.now(),
            status,
            rating: ratingStr ? parseInt(ratingStr) : undefined
        });
    }

    return entries;
}

// Simple CSV parser handling quotes
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i+1] === '"') {
                currentValue += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    values.push(currentValue);
    return values;
}
