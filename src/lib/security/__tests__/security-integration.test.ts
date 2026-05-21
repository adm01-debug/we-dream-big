import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeString } from '../validation';

describe('XSS Prevention & Sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should strip script tags while preserving safe formatting', () => {
      const input = '<p>Hello <b>World</b><script>alert(1)</script></p>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<p>Hello <b>World</b></p>');
      expect(output).not.toContain('<script>');
    });

    it('should strip unsafe tags carrying dangerous attributes like onclick', () => {
      const input = '<button onclick="alert(\'XSS\')">Click me</button>';
      const output = sanitizeHtml(input);
      // Allowlist endurecida: tags fora da lista são removidas por inteiro.
      expect(output).toBe('Click me');
    });

    it('should strip unsafe tags carrying javascript: pseudo-protocols', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).toBe('Link');
    });

    it('should handle nested tags and malformed HTML reasonably', () => {
      const input = '<div><scr<script>ipt>alert(1)</script></div>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('<script>');
    });
  });

  describe('sanitizeString', () => {
    it('should fully escape all HTML special characters', () => {
      const input = '<img src=x onerror="alert(1)"> & "Test"';
      const output = sanitizeString(input);
      expect(output).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;Test&quot;');
    });
  });
});
