import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReaderTTSController } from '../ReaderTTSController';
import { useTTSStore } from '../../../store/useTTSStore';

// Mock the store
vi.mock('../../../store/useTTSStore', () => ({
  useTTSStore: vi.fn(),
}));

describe('ReaderTTSController', () => {
  let jumpToMock: ReturnType<typeof vi.fn>;
  let onNextMock: ReturnType<typeof vi.fn>;
  let onPrevMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jumpToMock = vi.fn();
    onNextMock = vi.fn();
    onPrevMock = vi.fn();

    // Default store mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTTSStore as any).mockImplementation((selector: any) => {
        const state = {
            activeCfi: 'cfi-1',
            currentIndex: 1,
            status: 'playing',
            queue: ['item1', 'item2', 'item3'],
            jumpTo: jumpToMock
        };
        return selector(state);
    });
  });

  it('ignores arrow keys when an input is focused', () => {
    render(
      <ReaderTTSController
        rendition={null}
        viewMode="scrolled"
        onNext={onNextMock}
        onPrev={onPrevMock}
      />
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Fire event on the input, so it bubbles to window and e.target is the input
    fireEvent.keyDown(input, { key: 'ArrowLeft', bubbles: true });
    expect(jumpToMock).not.toHaveBeenCalled();
    expect(onPrevMock).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'ArrowRight', bubbles: true });
    expect(jumpToMock).not.toHaveBeenCalled();
    expect(onNextMock).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

    it('ignores arrow keys when a textarea is focused', () => {
    render(
      <ReaderTTSController
        rendition={null}
        viewMode="scrolled"
        onNext={onNextMock}
        onPrev={onPrevMock}
      />
    );

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    // Fire event on the textarea
    fireEvent.keyDown(textarea, { key: 'ArrowLeft', bubbles: true });
    expect(jumpToMock).not.toHaveBeenCalled();
    expect(onPrevMock).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'ArrowRight', bubbles: true });
    expect(jumpToMock).not.toHaveBeenCalled();
    expect(onNextMock).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

    it('responds to arrow keys when no input is focused', () => {
    render(
      <ReaderTTSController
        rendition={null}
        viewMode="scrolled"
        onNext={onNextMock}
        onPrev={onPrevMock}
      />
    );

    // Make sure body is focused or nothing specific
    document.body.focus();

    // Fire on body or window (bubbling from body)
    fireEvent.keyDown(document.body, { key: 'ArrowLeft', bubbles: true });
    expect(jumpToMock).toHaveBeenCalledWith(0); // index - 1
  });

});
