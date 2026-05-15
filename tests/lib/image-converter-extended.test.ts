/**
 * Tests for image-converter — extended with edge cases
 */
import { describe, it, expect } from 'vitest';
import { needsConversion } from '@/lib/image-converter';

describe('needsConversion — extended', () => {
  it('false for PNG', () => {
    expect(needsConversion(new File([''], 'a.png', { type: 'image/png' }))).toBe(false);
  });
  it('false for JPEG', () => {
    expect(needsConversion(new File([''], 'a.jpg', { type: 'image/jpeg' }))).toBe(false);
  });
  it('false for JPG type', () => {
    expect(needsConversion(new File([''], 'a.jpg', { type: 'image/jpg' }))).toBe(false);
  });
  it('true for SVG', () => {
    expect(needsConversion(new File([''], 'a.svg', { type: 'image/svg+xml' }))).toBe(true);
  });
  it('true for WebP', () => {
    expect(needsConversion(new File([''], 'a.webp', { type: 'image/webp' }))).toBe(true);
  });
  it('true for BMP', () => {
    expect(needsConversion(new File([''], 'a.bmp', { type: 'image/bmp' }))).toBe(true);
  });
  it('true for GIF', () => {
    expect(needsConversion(new File([''], 'a.gif', { type: 'image/gif' }))).toBe(true);
  });
  it('true for TIFF', () => {
    expect(needsConversion(new File([''], 'a.tiff', { type: 'image/tiff' }))).toBe(true);
  });
  it('true for AVIF', () => {
    expect(needsConversion(new File([''], 'a.avif', { type: 'image/avif' }))).toBe(true);
  });
  it('true for empty type', () => {
    expect(needsConversion(new File([''], 'a.xyz', { type: '' }))).toBe(true);
  });
});
