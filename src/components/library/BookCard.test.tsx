import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { BookCard } from './BookCard';
import type { BookMetadata } from '../../types/db';
import { useLibraryStore } from '../../store/useLibraryStore';

// Mock useLibraryStore
vi.mock('../../store/useLibraryStore', () => ({
  useLibraryStore: vi.fn(),
}));

// Mock DropdownMenu components to simplify testing
vi.mock('../ui/DropdownMenu', () => {
    return {
        DropdownMenu: ({ children, open, onOpenChange }: any) => {
            return <div data-testid="dropdown-menu" data-state={open ? 'open' : 'closed'}>{children}</div>;
        },
        DropdownMenuTrigger: ({ children, asChild }: any) => {
             // If asChild is true, we should probably clone the element, but for now just rendering children is enough if it's a valid element.
             // But actually, Trigger wraps the button.
             return <div data-testid="dropdown-trigger" onClick={(e) => { e.stopPropagation(); }}>{children}</div>
        },
        DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
        DropdownMenuItem: ({ children, onClick, 'data-testid': testId }: any) => (
            <div data-testid={testId} onClick={onClick}>
                {children}
            </div>
        ),
    };
});


describe('BookCard', () => {
  const mockBook: BookMetadata = {
    id: '1',
    title: 'Test Title',
    author: 'Test Author',
    description: 'Test Description',
    addedAt: 1234567890,
    coverBlob: new Blob(['mock-image'], { type: 'image/jpeg' }),
  };

  const mockRemoveBook = vi.fn();
  const mockOffloadBook = vi.fn();
  const mockRestoreBook = vi.fn();

  beforeEach(() => {
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Setup store mock
    (useLibraryStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      removeBook: mockRemoveBook,
      offloadBook: mockOffloadBook,
      restoreBook: mockRestoreBook,
    });
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</BrowserRouter>);
  };

  it('should render book info', () => {
    renderWithRouter(<BookCard book={mockBook} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('should render cover image if blob is present', () => {
    renderWithRouter(<BookCard book={mockBook} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'blob:mock-url');
    expect(img).toHaveAttribute('alt', 'Cover of Test Title');
  });

  it('should render placeholder if no cover blob', () => {
    const bookWithoutCover = { ...mockBook, coverBlob: undefined };
    renderWithRouter(<BookCard book={bookWithoutCover} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Aa')).toBeInTheDocument();
  });

  it('should clean up object URL on unmount', () => {
    const { unmount } = renderWithRouter(<BookCard book={mockBook} />);

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBook.coverBlob);

    unmount();

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should render progress bar when progress > 0', () => {
    const bookWithProgress = { ...mockBook, progress: 0.45 };
    renderWithRouter(<BookCard book={bookWithProgress} />);

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '45%' });

    const progressContainer = screen.getByRole('progressbar');
    expect(progressContainer).toBeInTheDocument();
    expect(progressContainer).toHaveAttribute('aria-valuenow', '45');
    expect(progressContainer).toHaveAttribute('aria-valuemin', '0');
    expect(progressContainer).toHaveAttribute('aria-valuemax', '100');
    expect(progressContainer).toHaveAttribute('aria-label', 'Reading progress: 45%');
  });

  it('should not render progress bar when progress is 0 or undefined', () => {
    const bookWithZeroProgress = { ...mockBook, progress: 0 };
    renderWithRouter(<BookCard book={bookWithZeroProgress} />);
    expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();

    const bookWithUndefinedProgress = { ...mockBook, progress: undefined };
    renderWithRouter(<BookCard book={bookWithUndefinedProgress} />);
    expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
  });

  it('should have accessibility attributes', () => {
    renderWithRouter(<BookCard book={mockBook} />);

    const card = screen.getByTestId(`book-card-${mockBook.id}`);
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabIndex', '0');

    const menuButton = screen.getByLabelText('Book actions');
    expect(menuButton).toBeInTheDocument();
  });

  it('should open delete confirmation dialog and delete book', async () => {
    // Mock window.confirm (though we are using a Dialog now)
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderWithRouter(<BookCard book={mockBook} />);

    // Since we mocked DropdownMenu, content is always rendered in DOM, so we can find menu-delete immediately if we assume it is open or rendered.
    // Real DropdownMenu only renders content when open.
    // But in our Mock, we render Children inside DropdownMenu.
    // DropdownMenuContent renders children inside DropdownMenu.

    // Let's trigger the click to simulate user flow anyway.
    const menuButton = screen.getByLabelText('Book actions');
    fireEvent.click(menuButton);

    // Find delete option (it should be visible in our mock or we can wait for it if it was real)
    const deleteOption = await screen.findByTestId('menu-delete');
    fireEvent.click(deleteOption);

    // Verify dialog is open
    expect(await screen.findByText('Delete Book')).toBeInTheDocument();
    // Update expected text to match the new BookActionMenu text
    expect(screen.getByText(`Are you sure you want to delete "${mockBook.title}"? This cannot be undone.`)).toBeInTheDocument();

    // Click delete in dialog
    const confirmButton = screen.getByTestId('confirm-delete');
    fireEvent.click(confirmButton);

    expect(mockRemoveBook).toHaveBeenCalledWith(mockBook.id);
  });
});
