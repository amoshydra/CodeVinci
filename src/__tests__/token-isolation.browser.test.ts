import { describe, it, expect, beforeEach } from 'vitest';
import { llmConfigStore, getDefaultLLMConfig } from '../services/llm/config';

describe('Token DOM isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('config store does not render API key in any DOM element after store', () => {
    const config = getDefaultLLMConfig();
    config.apiKey = 'sk-test-key-12345';
    llmConfigStore.store(config);

    // Verify the key is in localStorage (it should be)
    const stored = localStorage.getItem('codevinci-llm-config');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.apiKey).toBe('sk-test-key-12345');

    // Verify the key is NOT in any rendered DOM element
    const bodyText = document.body.innerHTML;
    expect(bodyText).not.toContain('sk-test-key-12345');
  });

  it('no input element on the page contains the API key value', () => {
    const config = getDefaultLLMConfig();
    config.apiKey = 'sk-another-test-key';
    llmConfigStore.store(config);

    const inputs = document.querySelectorAll('input');
    const keyInInputs = Array.from(inputs).some(input => input.value.includes('sk-another-test-key'));
    expect(keyInInputs).toBe(false);
  });
});
