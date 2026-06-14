import { describe, it, expect } from 'vitest';
import { extractOrigin, getEndpointForProvider, getDefaultLLMConfig } from '../config';

describe('extractOrigin', () => {
  it('extracts origin from https URL', () => {
    expect(extractOrigin('https://api.openai.com/v1')).toBe('https://api.openai.com');
  });

  it('extracts origin from http URL', () => {
    expect(extractOrigin('http://localhost:11434/v1')).toBe('http://localhost:11434');
  });

  it('strips trailing slashes before parsing', () => {
    expect(extractOrigin('https://example.com/v1/')).toBe('https://example.com');
  });

  it('returns empty string for invalid URL', () => {
    expect(extractOrigin('not-a-url')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(extractOrigin('')).toBe('');
  });
});

describe('getEndpointForProvider', () => {
  it('returns OpenAI endpoint for openai provider', () => {
    expect(getEndpointForProvider('openai', 'http://localhost:11434/v1')).toBe('https://api.openai.com/v1');
  });

  it('returns current endpoint for openai-compatible if not default OpenAI', () => {
    expect(getEndpointForProvider('openai-compatible', 'http://custom:8080/v1')).toBe('http://custom:8080/v1');
  });

  it('returns default local endpoint when switching from OpenAI to compatible', () => {
    expect(getEndpointForProvider('openai-compatible', 'https://api.openai.com/v1')).toBe(getDefaultLLMConfig().apiEndpoint);
  });
});
