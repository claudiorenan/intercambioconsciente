import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load validation.js into the jsdom global scope via eval
// (the module assigns ContentFilter and Validation to window)
beforeAll(() => {
  const code = readFileSync(resolve(__dirname, '../js/validation.js'), 'utf-8');
  eval(code);
});

// ---------------------------------------------------------------------------
// ContentFilter
// ---------------------------------------------------------------------------

describe('ContentFilter', () => {
  describe('phone detection', () => {
    it('should detect international phone numbers', () => {
      expect(ContentFilter.check('+55 11 99999-1234').blocked).toBe(true);
    });

    it('should detect phone with parentheses area code', () => {
      expect(ContentFilter.check('(11) 99999-1234').blocked).toBe(true);
    });

    it('should detect raw digit sequences that look like phones', () => {
      expect(ContentFilter.check('11999991234').blocked).toBe(true);
    });

    it('should return "numero de telefone" as the type label', () => {
      expect(ContentFilter.check('+55 11 99999-1234').type).toBe('numero de telefone');
    });
  });

  describe('email detection', () => {
    it('should detect simple emails', () => {
      expect(ContentFilter.check('user@example.com').blocked).toBe(true);
    });

    it('should detect emails with dots and plus signs', () => {
      expect(ContentFilter.check('test.user+tag@gmail.com').blocked).toBe(true);
    });

    it('should return "endereco de email" as the type label', () => {
      expect(ContentFilter.check('user@test.com').type).toBe('endereco de email');
    });
  });

  describe('URL detection', () => {
    it('should detect https URLs', () => {
      expect(ContentFilter.check('https://example.com').blocked).toBe(true);
    });

    it('should detect http URLs with paths', () => {
      expect(ContentFilter.check('http://test.org/page').blocked).toBe(true);
    });

    it('should return "link externo" as the type label', () => {
      expect(ContentFilter.check('https://x.com').type).toBe('link externo');
    });
  });

  describe('social handle detection', () => {
    it('should detect @handles with 3+ characters', () => {
      expect(ContentFilter.check('@username123').blocked).toBe(true);
    });

    it('should detect @handle embedded in text', () => {
      expect(ContentFilter.check('follow me @instauser').blocked).toBe(true);
    });

    it('should NOT detect very short handles (< 3 chars after @)', () => {
      expect(ContentFilter.check('@ab').blocked).toBe(false);
    });

    it('should return "rede social" as the type label', () => {
      expect(ContentFilter.check('@myhandle').type).toBe('rede social');
    });
  });

  describe('clean text', () => {
    it('should allow regular Portuguese text', () => {
      expect(ContentFilter.check('Estou amando o intercambio!').blocked).toBe(false);
    });

    it('should allow text with accented characters', () => {
      expect(ContentFilter.check('A cultura aqui e muito diferente').blocked).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return blocked:false for empty string', () => {
      expect(ContentFilter.check('').blocked).toBe(false);
    });

    it('should return blocked:false for null', () => {
      expect(ContentFilter.check(null).blocked).toBe(false);
    });

    it('should return blocked:false for undefined', () => {
      expect(ContentFilter.check(undefined).blocked).toBe(false);
    });

    it('should handle consecutive calls without regex lastIndex issues', () => {
      // The code resets lastIndex = 0 before each test,
      // so this sequence must always work correctly.
      ContentFilter.check('@user1');
      ContentFilter.check('@user2');
      const result = ContentFilter.check('@user3');
      expect(result.blocked).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('Validation', () => {
  describe('isValidEmail', () => {
    it('should accept a standard email', () => {
      expect(Validation.isValidEmail('user@example.com')).toBe(true);
    });

    it('should accept a minimal valid email', () => {
      expect(Validation.isValidEmail('a@b.co')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(Validation.isValidEmail('')).toBe(false);
    });

    it('should reject text without @', () => {
      expect(Validation.isValidEmail('notanemail')).toBe(false);
    });

    it('should reject missing local part', () => {
      expect(Validation.isValidEmail('@missing.com')).toBe(false);
    });

    it('should reject missing TLD', () => {
      expect(Validation.isValidEmail('no@domain')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should accept passwords with exactly 6 characters', () => {
      expect(Validation.isValidPassword('123456')).toBe(true);
    });

    it('should accept passwords longer than 6 characters', () => {
      expect(Validation.isValidPassword('abcdefgh')).toBe(true);
    });

    it('should reject passwords shorter than 6 characters', () => {
      expect(Validation.isValidPassword('12345')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(Validation.isValidPassword('')).toBeFalsy();
    });

    it('should reject null', () => {
      expect(Validation.isValidPassword(null)).toBeFalsy();
    });

    it('should reject undefined', () => {
      expect(Validation.isValidPassword(undefined)).toBeFalsy();
    });
  });

  describe('sanitizeHTML', () => {
    it('should escape <script> tags', () => {
      const result = Validation.sanitizeHTML('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should escape HTML angle brackets', () => {
      const result = Validation.sanitizeHTML('<b>bold</b>');
      expect(result).toContain('&lt;b&gt;');
    });

    it('should leave plain text unchanged', () => {
      expect(Validation.sanitizeHTML('hello world')).toBe('hello world');
    });

    it('should escape ampersands', () => {
      const result = Validation.sanitizeHTML('a & b');
      expect(result).toContain('&amp;');
    });
  });
});
