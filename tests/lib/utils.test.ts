import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (classnames merger)', () => {
  it('should merge class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('should handle conflicting tailwind classes', () => {
    const result = cn('px-4', 'px-8');
    expect(result).toBe('px-8');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', true && 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('should handle undefined/null', () => {
    expect(cn(undefined, null, 'test')).toBe('test');
  });

  it('should handle empty call', () => {
    expect(cn()).toBe('');
  });

  it('should handle arrays', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
  });
});
