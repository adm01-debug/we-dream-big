import { describe, it, expect, vi } from 'vitest';
import { parseGateFlag, LocalStorageGateProvider } from '../providers';

describe('DevInfraGate Providers & Utils', () => {
  describe('parseGateFlag', () => {
    it('parseia valores positivos corretamente', () => {
      expect(parseGateFlag('true')).toBe(true);
      expect(parseGateFlag('1')).toBe(true);
      expect(parseGateFlag('on')).toBe(true);
      expect(parseGateFlag('yes')).toBe(true);
      expect(parseGateFlag('  TRUE  ')).toBe(true);
    });

    it('parseia valores negativos corretamente', () => {
      expect(parseGateFlag('false')).toBe(false);
      expect(parseGateFlag('0')).toBe(false);
      expect(parseGateFlag('off')).toBe(false);
      expect(parseGateFlag('no')).toBe(false);
    });

    it('retorna "auto" para valores desconhecidos ou vazios', () => {
      expect(parseGateFlag('')).toBe('auto');
      expect(parseGateFlag('auto')).toBe('auto');
      expect(parseGateFlag('maybe')).toBe('auto');
      expect(parseGateFlag(null)).toBe('auto');
      expect(parseGateFlag(undefined)).toBe('auto');
    });
  });

  describe('LocalStorageGateProvider', () => {
    it('lê valores do localStorage', () => {
      const provider = new LocalStorageGateProvider('test_key');
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('true');

      expect(provider.getFlag()).toBe(true);
      expect(getItemSpy).toHaveBeenCalledWith('test_key');

      getItemSpy.mockRestore();
    });

    it('retorna "auto" se o localStorage lançar erro', () => {
      const provider = new LocalStorageGateProvider('test_key');
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(provider.getFlag()).toBe('auto');
      vi.restoreAllMocks();
    });
  });
});
