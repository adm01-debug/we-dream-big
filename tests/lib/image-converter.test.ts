import { describe, it, expect } from 'vitest';
import { needsConversion } from '@/lib/image-converter';

describe('needsConversion', () => {
  it('returns false for PNG', () => {
    const file = new File([''], 'test.png', { type: 'image/png' });
    expect(needsConversion(file)).toBe(false);
  });

  it('returns false for JPEG', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    expect(needsConversion(file)).toBe(false);
  });

  it('returns true for SVG', () => {
    const file = new File([''], 'logo.svg', { type: 'image/svg+xml' });
    expect(needsConversion(file)).toBe(true);
  });

  it('returns true for WebP', () => {
    const file = new File([''], 'photo.webp', { type: 'image/webp' });
    expect(needsConversion(file)).toBe(true);
  });

  it('returns true for BMP', () => {
    const file = new File([''], 'old.bmp', { type: 'image/bmp' });
    expect(needsConversion(file)).toBe(true);
  });

  it('returns true for unknown types', () => {
    const file = new File([''], 'file.tiff', { type: 'image/tiff' });
    expect(needsConversion(file)).toBe(true);
  });
});
