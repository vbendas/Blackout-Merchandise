import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn (className utility)', () => {
  it('should merge simple class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn('base-class', isActive && 'active', isDisabled && 'disabled');

    expect(result).toBe('base-class active');
  });

  it('should handle object syntax', () => {
    const result = cn({
      'class-a': true,
      'class-b': false,
      'class-c': true,
    });

    expect(result).toBe('class-a class-c');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    // Tailwind merge should keep the last conflicting class
    expect(result).toBe('py-1 px-4');
  });

  it('should handle array of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should filter out falsy values', () => {
    const result = cn('base', null, undefined, false, '', 'valid-class');

    expect(result).toBe('base valid-class');
  });

  it('should handle complex mixed input', () => {
    const isOpen = true;
    const hasError = false;

    const result = cn(
      'button',
      isOpen && 'button--open',
      hasError && 'button--error',
      {
        'button--primary': true,
        'button--secondary': false,
      },
      ['extra', 'classes']
    );

    expect(result).toBe('button button--open button--primary extra classes');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle only falsy values', () => {
    const result = cn(null, undefined, false, '');
    expect(result).toBe('');
  });
});
