export interface NormalizedKey {
  key: string;
  code: string;
}

const NAMED_KEYS: Record<string, NormalizedKey> = {
  ' ': { key: ' ', code: 'Space' },
  space: { key: ' ', code: 'Space' },
  spacebar: { key: ' ', code: 'Space' },
  enter: { key: 'Enter', code: 'Enter' },
  return: { key: 'Enter', code: 'Enter' },
  escape: { key: 'Escape', code: 'Escape' },
  esc: { key: 'Escape', code: 'Escape' },
  tab: { key: 'Tab', code: 'Tab' },
  backspace: { key: 'Backspace', code: 'Backspace' },
  delete: { key: 'Delete', code: 'Delete' },
  arrowup: { key: 'ArrowUp', code: 'ArrowUp' },
  arrowdown: { key: 'ArrowDown', code: 'ArrowDown' },
  arrowleft: { key: 'ArrowLeft', code: 'ArrowLeft' },
  arrowright: { key: 'ArrowRight', code: 'ArrowRight' },
  shift: { key: 'Shift', code: 'ShiftLeft' },
  control: { key: 'Control', code: 'ControlLeft' },
  alt: { key: 'Alt', code: 'AltLeft' },
  meta: { key: 'Meta', code: 'MetaLeft' },
  home: { key: 'Home', code: 'Home' },
  end: { key: 'End', code: 'End' },
  pageup: { key: 'PageUp', code: 'PageUp' },
  pagedown: { key: 'PageDown', code: 'PageDown' },
};

/**
 * Normalizes an agent-supplied key into the key/code pair a real keyboard
 * event carries. Agents commonly say "Space", while browsers report key " "
 * and code "Space"; apps checking either should work.
 */
export const normalizeKey = (raw: string): NormalizedKey => {
  const named = NAMED_KEYS[raw.toLowerCase()];
  if (named) return named;

  if (raw.length === 1) {
    if (/[a-z]/i.test(raw)) {
      return { key: raw, code: `Key${raw.toUpperCase()}` };
    }
    if (/[0-9]/.test(raw)) {
      return { key: raw, code: `Digit${raw}` };
    }
  }

  return { key: raw, code: '' };
};
