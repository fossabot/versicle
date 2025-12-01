import type { LexiconRule } from '../../types/db';

export const LexiconCSV = {
  parse(text: string): Omit<LexiconRule, 'id' | 'created' | 'bookId'>[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return []; // Header only or empty

    const result: Omit<LexiconRule, 'id' | 'created' | 'bookId'>[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV regex for parsing: matches "quoted" or unquoted
        // Handles escaped quotes ("") inside quoted strings
        const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);

        if (matches) {
           const clean = matches.map(m => {
               // Remove leading comma if present (from the regex group start)
               let s = m.replace(/^,/, '');
               // Unquote if it's a quoted string
               if (s.startsWith('"') && s.endsWith('"')) {
                   s = s.slice(1, -1).replace(/""/g, '"');
               }
               return s;
           });

           // We need at least original and replacement
           if (clean.length >= 2) {
               result.push({
                   original: clean[0],
                   replacement: clean[1],
                   // Default to false if missing
                   isRegex: clean[2]?.toLowerCase() === 'true' || clean[2] === '1'
               });
           }
        }
    }
    return result;
  },

  generate(rules: LexiconRule[]): string {
    const headers = "original,replacement,isRegex";
    const rows = rules.map(r => {
        // Escape quotes by doubling them
        const original = (r.original || '').replace(/"/g, '""');
        const replacement = (r.replacement || '').replace(/"/g, '""');

        // Always wrap in quotes for simplicity and safety against commas
        return `"${original}","${replacement}",${!!r.isRegex}`;
    });
    return [headers, ...rows].join('\n');
  }
};

export const SimpleListCSV = {
  parse(text: string, expectedHeader?: string): string[] {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);

    // Remove header if it matches the expected header (case-insensitive)
    if (lines.length > 0 && expectedHeader) {
         if (lines[0].toLowerCase() === expectedHeader.toLowerCase()) {
            lines.shift();
         }
    }

    return lines;
  },

  generate(items: string[], header: string): string {
    return `${header}\n` + items.join("\n");
  }
};
