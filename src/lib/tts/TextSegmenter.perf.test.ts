import { describe, it, expect, vi } from 'vitest';
import { TextSegmenter } from './TextSegmenter';

describe('TextSegmenter Performance', () => {
    it('avoids unnecessary string splitting during post-processing', () => {
        // Create a segmenter with a dummy abbreviation to potentially trigger logic
        const segmenter = new TextSegmenter('en', ['Dr.']);

        // precise number of sentences
        const numSentences = 100;
        const sentence = "This is a moderately long sentence to demonstrate the performance impact of splitting strings.";
        const text = Array(numSentences).fill(sentence).join(" ");

        const splitSpy = vi.spyOn(String.prototype, 'split');

        segmenter.segment(text);

        const callCount = splitSpy.mock.calls.length;
        console.log(`Split called ${callCount} times for ${numSentences} sentences.`);

        splitSpy.mockRestore();

        // FAIL CONDITION:
        // Currently, it splits roughly once per sentence boundary (checking for abbreviations).
        // For 100 sentences, we expect ~99 splits.
        // We want to optimize this to near 0.
        // So we assert that it is less than 10.
        // This assertion should FAIL currently.
        expect(callCount).toBeLessThan(10);
    });
});
