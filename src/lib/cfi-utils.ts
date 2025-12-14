import ePub from 'epubjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EpubCFI = (ePub as any).CFI;

export interface CfiRangeData {
  parent: string;
  start: string;
  end: string;
  fullStart: string;
  fullEnd: string;
}

export function parseCfiRange(range: string): CfiRangeData | null {
    if (!range || !range.startsWith('epubcfi(') || !range.endsWith(')')) return null;

    const content = range.slice(8, -1); // remove epubcfi( and )
    const parts = content.split(',');

    if (parts.length === 3) {
        const parent = parts[0];
        const start = parts[1];
        const end = parts[2];
        return {
            parent,
            start,
            end,
            fullStart: `epubcfi(${parent}${start})`,
            fullEnd: `epubcfi(${parent}${end})`
        };
    }
    return null;
}

export function generateCfiRange(start: string, end: string): string {
    let i = 0;
    while (i < start.length && i < end.length && start[i] === end[i]) {
        i++;
    }

    // Backtrack to valid delimiter
    while (i > 0) {
        const char = start[i];
        // If remainder starts with separator, it's a good split point
        if (['/', '!', ':'].includes(char)) {
             break;
        }
        i--;
    }

    const common = start.substring(0, i);
    const startRel = start.substring(i);
    const endRel = end.substring(i);

    return `epubcfi(${common},${startRel},${endRel})`;
}

export function mergeCfiRanges(ranges: string[], newRange?: string): string[] {
    const allRanges = [...ranges];
    if (newRange) allRanges.push(newRange);

    if (allRanges.length === 0) return [];

    const cfi = new EpubCFI();
    const parsedRanges: CfiRangeData[] = [];

    for (const r of allRanges) {
        const p = parseCfiRange(r);
        if (p) {
            parsedRanges.push(p);
        } else {
            // If we can't parse it, we can't merge it safely.
            // Maybe keep it as is? But we return string[] of merged ranges.
            // Ideally we shouldn't have invalid ranges.
        }
    }

    if (parsedRanges.length === 0) return [];

    // Sort by fullStart
    parsedRanges.sort((a, b) => cfi.compare(a.fullStart, b.fullStart));

    const merged: CfiRangeData[] = [];
    let current = parsedRanges[0];

    for (let i = 1; i < parsedRanges.length; i++) {
        const next = parsedRanges[i];

        // Check overlap: next.start <= current.end
        // Compare returns -1 if a < b, 0 if a == b, 1 if a > b
        if (cfi.compare(next.fullStart, current.fullEnd) <= 0) {
            // Merge
            // newEnd = Max(current.end, next.end)
            if (cfi.compare(next.fullEnd, current.fullEnd) > 0) {
                current.fullEnd = next.fullEnd;
            }
        } else {
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);

    return merged.map(r => generateCfiRange(r.fullStart, r.fullEnd));
}
