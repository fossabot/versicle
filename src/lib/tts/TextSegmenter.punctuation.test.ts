import { describe, it, expect } from 'vitest';
import { TextSegmenter, DEFAULT_ALWAYS_MERGE } from './TextSegmenter';

describe('TextSegmenter - Punctuation Handling', () => {
    // Add common abbreviations that might be encountered
    const extraAbbreviations = ['Dr.', 'St.', 'Gov.', 'Capt.', 'Lt.', 'Col.', 'Maj.', 'Rev.', 'Sgt.'];
    const segmenter = new TextSegmenter('en', extraAbbreviations, DEFAULT_ALWAYS_MERGE);

    it('should handle "Mr." inside parentheses', () => {
        const text = 'I met (Mr. Smith) yesterday.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('I met (Mr. Smith) yesterday.');
    });

    it('should handle "Mrs." inside brackets', () => {
        const text = 'I saw [Mrs. Robinson] today.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('I saw [Mrs. Robinson] today.');
    });

    it('should handle "Ms." inside double quotes', () => {
        const text = 'He called "Ms. Jones" clearly.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('He called "Ms. Jones" clearly.');
    });

    it('should handle "Prof." inside single quotes', () => {
        const text = "It was 'Prof. X' entering.";
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe("It was 'Prof. X' entering.");
    });

    it('should handle "Dr." inside parentheses', () => {
        const text = 'The show (Dr. Who) is popular.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('The show (Dr. Who) is popular.');
    });

    it('should handle "Gen." inside braces', () => {
        const text = 'Commanded by {Gen. Kenobi} himself.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('Commanded by {Gen. Kenobi} himself.');
    });

    it('should handle "Rep." inside angle brackets', () => {
        const text = 'Email to <Rep. Smith> sent.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('Email to <Rep. Smith> sent.');
    });

    it('should handle "Sen." inside double quotes', () => {
        const text = 'Vote for "Sen. Palpatine" now.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('Vote for "Sen. Palpatine" now.');
    });

    it('should handle "Gov." inside parentheses', () => {
        const text = 'Seen with (Gov. Tarkin) recently.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('Seen with (Gov. Tarkin) recently.');
    });

    it('should handle "Capt." inside brackets', () => {
        const text = 'Salute [Capt. America] immediately.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('Salute [Capt. America] immediately.');
    });

    it('should handle "Lt." inside single quotes', () => {
        const text = "Found 'Lt. Dan' there.";
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe("Found 'Lt. Dan' there.");
    });

    it('should handle "Col." inside parentheses', () => {
        const text = 'Warning (Col. Mustang) is angry.';
        const segments = segmenter.segment(text);
        expect(segments).toHaveLength(1);
        expect(segments[0].text).toBe('Warning (Col. Mustang) is angry.');
    });
});
