import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnotationPopover } from '../AnnotationPopover';
import { useAnnotationStore } from '../../../store/useAnnotationStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Copy: () => <span data-testid="icon-copy" />,
  Highlighter: () => <span data-testid="icon-highlighter" />,
  StickyNote: () => <span data-testid="icon-note" />,
  X: () => <span data-testid="icon-close" />,
  Mic: () => <span data-testid="icon-mic" />,
  Play: () => <span data-testid="icon-play" />,
}));

// Mock useToastStore
const showToastMock = vi.fn();
vi.mock('../../../store/useToastStore', () => ({
  useToastStore: () => ({
    showToast: showToastMock,
  }),
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('AnnotationPopover', () => {
  beforeEach(() => {
    useAnnotationStore.setState({
      popover: { visible: false, x: 0, y: 0, cfiRange: '', text: '' },
      annotations: [],
    });
    vi.clearAllMocks();
  });

  it('should render nothing when not visible', () => {
    render(<AnnotationPopover bookId="book1" onClose={vi.fn()} />);
    expect(screen.queryByTestId('icon-close')).toBeNull();
  });

  it('should render when visible', () => {
    useAnnotationStore.setState({
      popover: { visible: true, x: 100, y: 100, cfiRange: 'cfi', text: 'text' },
    });

    render(<AnnotationPopover bookId="book1" onClose={vi.fn()} />);
    expect(screen.getByTestId('icon-close')).toBeInTheDocument();
    // Verify aria-labels are present
    expect(screen.getByLabelText('Highlight Yellow')).toBeInTheDocument();
    expect(screen.getByLabelText('Highlight Green')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy to Clipboard')).toBeInTheDocument();
  });

  it('should add annotation on color click', async () => {
    const addAnnotationMock = vi.fn();
    useAnnotationStore.setState({
      popover: { visible: true, x: 100, y: 100, cfiRange: 'cfi', text: 'text' },
      addAnnotation: addAnnotationMock,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const onCloseMock = vi.fn();
    render(<AnnotationPopover bookId="book1" onClose={onCloseMock} />);

    fireEvent.click(screen.getByLabelText('Highlight Yellow'));

    await waitFor(() => {
      expect(addAnnotationMock).toHaveBeenCalledWith(expect.objectContaining({
        bookId: 'book1',
        cfiRange: 'cfi',
        text: 'text',
        type: 'highlight',
        color: 'yellow',
      }));
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('should close on close button click', () => {
     useAnnotationStore.setState({
      popover: { visible: true, x: 100, y: 100, cfiRange: 'cfi', text: 'text' },
    });

    render(<AnnotationPopover bookId="book1" onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Close'));

    expect(useAnnotationStore.getState().popover.visible).toBe(false);
  });

  it('should copy text and show toast on copy click', async () => {
    const textToCopy = 'Selected text content';
    useAnnotationStore.setState({
      popover: { visible: true, x: 100, y: 100, cfiRange: 'cfi', text: textToCopy },
    });

    const onCloseMock = vi.fn();
    render(<AnnotationPopover bookId="book1" onClose={onCloseMock} />);

    fireEvent.click(screen.getByLabelText('Copy to Clipboard'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textToCopy);
    expect(showToastMock).toHaveBeenCalledWith("Copied to clipboard!", "success");
    expect(onCloseMock).toHaveBeenCalled();
  });
});
