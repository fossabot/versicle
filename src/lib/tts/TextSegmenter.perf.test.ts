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

        // REGRESSION TEST:
        // Previously, the implementation used `split` roughly once per sentence boundary.
        // This test ensures we rely on efficient regex extraction instead.
        // We assert that split calls are minimal (effectively 0 for this logic).
        expect(callCount).toBeLessThan(10);
    });
});
