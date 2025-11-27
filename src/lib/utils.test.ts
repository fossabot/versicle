import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  it('should merge class names', () => {
    expect(cn('c1', 'c2')).toBe('c1 c2');
  });

  it('should handle conditional classes', () => {
    const isTrue = true;
    const isFalse = false;
    expect(cn('c1', isTrue ? 'c2' : '', isFalse ? 'c3' : '')).toBe('c1 c2');
  });

  it('should handle arrays', () => {
    expect(cn(['c1', 'c2'])).toBe('c1 c2');
  });

  it('should handle objects', () => {
    expect(cn({ c1: true, c2: false })).toBe('c1');
  });

  it('should handle tailwind conflicts', () => {
      // clsx + tailwind-merge behavior
      expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
  });

  it('should handle mixed inputs', () => {
      expect(cn('c1', undefined, null, 'c2')).toBe('c1 c2');
  });
});
