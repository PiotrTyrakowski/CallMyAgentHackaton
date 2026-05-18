import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
  it('dedupes tailwind conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
