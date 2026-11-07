import { describe, it, expect } from 'vitest';
import { normalizeKey } from '../views/viewer/keyboard';

describe('normalizeKey', () => {
  it('maps Space aliases to key " " and code "Space"', () => {
    expect(normalizeKey('Space')).toEqual({ key: ' ', code: 'Space' });
    expect(normalizeKey('spacebar')).toEqual({ key: ' ', code: 'Space' });
    expect(normalizeKey(' ')).toEqual({ key: ' ', code: 'Space' });
  });

  it('maps named keys to their browser codes', () => {
    expect(normalizeKey('Enter')).toEqual({ key: 'Enter', code: 'Enter' });
    expect(normalizeKey('Escape')).toEqual({ key: 'Escape', code: 'Escape' });
    expect(normalizeKey('ArrowUp')).toEqual({ key: 'ArrowUp', code: 'ArrowUp' });
    expect(normalizeKey('Tab')).toEqual({ key: 'Tab', code: 'Tab' });
  });

  it('maps letters and digits to physical key codes', () => {
    expect(normalizeKey('a')).toEqual({ key: 'a', code: 'KeyA' });
    expect(normalizeKey('Z')).toEqual({ key: 'Z', code: 'KeyZ' });
    expect(normalizeKey('7')).toEqual({ key: '7', code: 'Digit7' });
  });

  it('passes unknown keys through with an empty code', () => {
    expect(normalizeKey('F13')).toEqual({ key: 'F13', code: '' });
    expect(normalizeKey('£')).toEqual({ key: '£', code: '' });
  });
});
