import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGreeting, getHighestRole, isSupervisorOrAbove, getRandomGreeting } from './auth-utils';
import { type AppRole } from '@/contexts/AuthContext';

describe('auth-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getGreeting', () => {
    it('returns "Bom dia" for morning hours', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 9, 0)); // 09:00
      expect(getGreeting()).toBe('Bom dia');
    });

    it('returns "Boa tarde" for afternoon hours', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 15, 0)); // 15:00
      expect(getGreeting()).toBe('Boa tarde');
    });

    it('returns "Boa noite" for night hours', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 21, 0)); // 21:00
      expect(getGreeting()).toBe('Boa noite');
    });
  });

  describe('getHighestRole', () => {
    it('returns null for empty roles', () => {
      expect(getHighestRole([])).toBeNull();
    });

    it('identifies dev as the highest role', () => {
      const roles: AppRole[] = ['agente', 'dev', 'supervisor'];
      expect(getHighestRole(roles)).toBe('dev');
    });

    it('identifies supervisor as higher than agente', () => {
      const roles: AppRole[] = ['agente', 'supervisor'];
      expect(getHighestRole(roles)).toBe('supervisor');
    });

    it('handles legacy roles (admin as supervisor)', () => {
      const roles: AppRole[] = ['admin', 'agente'];
      expect(getHighestRole(roles)).toBe('admin');
    });

    it('returns the role if only one is provided', () => {
      expect(getHighestRole(['agente'])).toBe('agente');
    });
  });

  describe('isSupervisorOrAbove', () => {
    it('returns true for dev', () => {
      expect(isSupervisorOrAbove(['dev'])).toBe(true);
    });

    it('returns true for supervisor', () => {
      expect(isSupervisorOrAbove(['supervisor'])).toBe(true);
    });

    it('returns true for legacy admin', () => {
      expect(isSupervisorOrAbove(['admin'])).toBe(true);
    });

    it('returns false for agente', () => {
      expect(isSupervisorOrAbove(['agente'])).toBe(false);
    });

    it('returns true if at least one role is supervisor or above', () => {
      expect(isSupervisorOrAbove(['agente', 'supervisor'])).toBe(true);
    });

    it('returns false for empty roles', () => {
      expect(isSupervisorOrAbove([])).toBe(false);
    });
  });

  // TODO(test-debt): teste flaky — Math.random() em getRandomGreeting pode
  // selecionar template sem `{greeting}` (ex: "Fala, {name}!" não tem
  // placeholder), fazendo o expect('Bom dia') falhar. Fix: forçar seed
  // determinístico ou alterar assertion para containers diferentes.
  describe.skip('getRandomGreeting', () => {
    it('replaces templates correctly', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 9, 0)); // 09:00 -> "Bom dia"
      const name = 'John';
      const result = getRandomGreeting(name);

      expect(result).toContain(name);
      expect(result).toContain('Bom dia');
    });
  });
});
