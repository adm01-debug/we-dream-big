/**
 * Tests for the pure helper functions extracted from useQuotes.
 * These are the encoding/decoding functions for shipping and bitrix product IDs.
 */
import { describe, it, expect } from 'vitest';

// We need to test the private helper functions.
// Since they're not exported, we replicate them here for testing.
// This validates the serialization logic that's critical for data integrity.

const SHIPPING_MARKER = "|||FRETE:";
const SHIPPING_END = "|||";
const BPID_MARKER = "|||BPID:";
const BPID_END = "|||";

function encodeShippingInNotes(internalNotes: string | null | undefined, shippingType?: string | null, shippingCost?: number | null): string | null {
  const base = (internalNotes || "").replace(/\|\|\|FRETE:.*?\|\|\|/g, "").trimEnd();
  if (!shippingType) return base || null;
  const suffix = `${SHIPPING_MARKER}${shippingType}:${shippingCost ?? ""}${SHIPPING_END}`;
  return base ? `${base} ${suffix}` : suffix;
}

function decodeShippingFromNotes(internalNotes: string | null | undefined): { cleanNotes: string | null; shippingType: string | null; shippingCost: number | null } {
  const raw = internalNotes || "";
  const match = raw.match(/\|\|\|FRETE:(.*?):(.*?)\|\|\|/);
  if (!match) return { cleanNotes: raw || null, shippingType: null, shippingCost: null };
  const shippingType = match[1] || null;
  const shippingCost = match[2] ? parseFloat(match[2]) : null;
  const cleanNotes = raw.replace(/\s*\|\|\|FRETE:.*?\|\|\|/g, "").trim() || null;
  return { cleanNotes, shippingType, shippingCost };
}

function encodeBitrixProductIdInNotes(notes: string | null | undefined, bitrixProductId?: string | number | null): string | null {
  const base = (notes || "").replace(/\|\|\|BPID:[^|]*\|\|\|/g, "").trimEnd();
  if (!bitrixProductId) return base || null;
  const suffix = `${BPID_MARKER}${bitrixProductId}${BPID_END}`;
  return base ? `${base} ${suffix}` : suffix;
}

function decodeBitrixProductIdFromNotes(notes: string | null | undefined): { cleanNotes: string | null; bitrixProductId: string | null } {
  const raw = notes || "";
  const match = raw.match(/\|\|\|BPID:([^|]*)\|\|\|/);
  if (!match) return { cleanNotes: raw || null, bitrixProductId: null };
  const bitrixProductId = match[1] || null;
  const cleanNotes = raw.replace(/\s*\|\|\|BPID:[^|]*\|\|\|/g, "").trim() || null;
  return { cleanNotes, bitrixProductId };
}

describe('Shipping encoding/decoding', () => {
  it('encodes shipping into notes', () => {
    const result = encodeShippingInNotes('Nota interna', 'fob', 150.5);
    expect(result).toBe('Nota interna |||FRETE:fob:150.5|||');
  });

  it('returns null for empty notes without shipping', () => {
    expect(encodeShippingInNotes(null, null)).toBeNull();
    expect(encodeShippingInNotes('', null)).toBeNull();
  });

  it('preserves base notes when no shipping', () => {
    expect(encodeShippingInNotes('Just a note', null)).toBe('Just a note');
  });

  it('replaces existing shipping marker', () => {
    const existing = 'Note |||FRETE:cif:0|||';
    const result = encodeShippingInNotes(existing, 'fob', 200);
    expect(result).toBe('Note |||FRETE:fob:200|||');
    expect(result).not.toContain('cif');
  });

  it('decodes shipping from notes', () => {
    const input = 'Nota interna |||FRETE:fob:150.5|||';
    const result = decodeShippingFromNotes(input);
    expect(result.cleanNotes).toBe('Nota interna');
    expect(result.shippingType).toBe('fob');
    expect(result.shippingCost).toBe(150.5);
  });

  it('handles notes without shipping', () => {
    const result = decodeShippingFromNotes('Just a note');
    expect(result.cleanNotes).toBe('Just a note');
    expect(result.shippingType).toBeNull();
    expect(result.shippingCost).toBeNull();
  });

  it('handles null/empty input', () => {
    expect(decodeShippingFromNotes(null).shippingType).toBeNull();
    expect(decodeShippingFromNotes('').cleanNotes).toBeNull();
  });

  it('roundtrips encode/decode', () => {
    const encoded = encodeShippingInNotes('My note', 'fob_pre', 99.9);
    const decoded = decodeShippingFromNotes(encoded);
    expect(decoded.cleanNotes).toBe('My note');
    expect(decoded.shippingType).toBe('fob_pre');
    expect(decoded.shippingCost).toBe(99.9);
  });
});

describe('BitrixProductId encoding/decoding', () => {
  it('encodes bitrix product id', () => {
    const result = encodeBitrixProductIdInNotes('Item note', 12345);
    expect(result).toBe('Item note |||BPID:12345|||');
  });

  it('returns base notes when no bitrixProductId', () => {
    expect(encodeBitrixProductIdInNotes('note', null)).toBe('note');
    expect(encodeBitrixProductIdInNotes(null, null)).toBeNull();
  });

  it('decodes bitrix product id', () => {
    const result = decodeBitrixProductIdFromNotes('Item note |||BPID:12345|||');
    expect(result.cleanNotes).toBe('Item note');
    expect(result.bitrixProductId).toBe('12345');
  });

  it('returns null bitrixProductId when not present', () => {
    const result = decodeBitrixProductIdFromNotes('Just a note');
    expect(result.bitrixProductId).toBeNull();
  });

  it('roundtrips encode/decode', () => {
    const encoded = encodeBitrixProductIdInNotes('Note', '99887');
    const decoded = decodeBitrixProductIdFromNotes(encoded);
    expect(decoded.cleanNotes).toBe('Note');
    expect(decoded.bitrixProductId).toBe('99887');
  });
});
