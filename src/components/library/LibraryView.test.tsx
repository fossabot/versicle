import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LibraryView } from './LibraryView';
import { useLibraryStore } from '../../store/useLibraryStore';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../../store/useLibraryStore');

describe('LibraryView', () => {
  const mockFetchBooks = vi.fn();
  const mockBooks = [
    {
      id: '1',
      title: 'Book 1',
      author: 'Author 1',
      addedAt: 100,
      description: 'Desc 1',
    },
    {
      id: '2',
      title: 'Book 2',
      author: 'Author 2',
      addedAt: 200,
      description: 'Desc 2',
    },
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useLibraryStore as any).mockReturnValue({
      books: [],
      isLoading: false,
      error: null,
      fetchBooks: mockFetchBooks,
    });
  });

  it('should render the library header', () => {
    render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );
    expect(screen.getByText('My Library')).toBeInTheDocument();
    expect(screen.getByText('Manage and read your EPUB collection')).toBeInTheDocument();
  });

  it('should fetch books on mount', () => {
    render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );
    expect(mockFetchBooks).toHaveBeenCalledTimes(1);
  });

  it('should display loading state', () => {
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useLibraryStore as any).mockReturnValue({
      books: [],
      isLoading: true,
      error: null,
      fetchBooks: mockFetchBooks,
    });

    const { container } = render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );

    // Check for spinner (using class selector as it has no text)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should display empty state when no books', () => {
    render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );
    expect(screen.getByText('No books yet. Import one to get started!')).toBeInTheDocument();
  });

  it('should display books list', () => {
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useLibraryStore as any).mockReturnValue({
      books: mockBooks,
      isLoading: false,
      error: null,
      fetchBooks: mockFetchBooks,
    });

    render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );

    expect(screen.getByText('Book 1')).toBeInTheDocument();
    expect(screen.getByText('Author 1')).toBeInTheDocument();
    expect(screen.getByText('Book 2')).toBeInTheDocument();
    expect(screen.getByText('Author 2')).toBeInTheDocument();
  });

  it('should display error message', () => {
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useLibraryStore as any).mockReturnValue({
      books: [],
      isLoading: false,
      error: 'Something went wrong',
      fetchBooks: mockFetchBooks,
    });

    render(
      <MemoryRouter>
        <LibraryView />
      </MemoryRouter>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
