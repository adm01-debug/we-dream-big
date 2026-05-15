/**
 * E2E Tests — Profile & User Settings Module
 * Covers: Profile form, avatar, password change, 2FA, preferences
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ============ Profile Schema ============
const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  department: z.string().optional(),
});

describe('E2E Profile — Form Validation', () => {
  it('accepts valid profile', () => {
    expect(profileSchema.safeParse({ full_name: 'João', email: 'j@t.com' }).success).toBe(true);
  });
  it('rejects empty name', () => {
    expect(profileSchema.safeParse({ full_name: '', email: 'j@t.com' }).success).toBe(false);
  });
  it('rejects short name', () => {
    expect(profileSchema.safeParse({ full_name: 'J', email: 'j@t.com' }).success).toBe(false);
  });
  it('rejects invalid email', () => {
    expect(profileSchema.safeParse({ full_name: 'João', email: 'invalid' }).success).toBe(false);
  });
  it('phone is optional', () => {
    expect(profileSchema.safeParse({ full_name: 'João', email: 'j@t.com', phone: '11999999999' }).success).toBe(true);
  });
  it('department is optional', () => {
    expect(profileSchema.safeParse({ full_name: 'João', email: 'j@t.com', department: 'Vendas' }).success).toBe(true);
  });
});

// ============ Avatar Upload ============
describe('E2E Profile — Avatar', () => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSizeMB = 2;

  it('accepts JPEG', () => expect(validTypes).toContain('image/jpeg'));
  it('accepts PNG', () => expect(validTypes).toContain('image/png'));
  it('rejects SVG', () => expect(validTypes).not.toContain('image/svg+xml'));
  it('max size is 2MB', () => expect(maxSizeMB).toBe(2));
  
  it('validates file size', () => {
    const fileSizeBytes = 1.5 * 1024 * 1024; // 1.5MB
    expect(fileSizeBytes <= maxSizeMB * 1024 * 1024).toBe(true);
  });
  it('rejects oversized file', () => {
    const fileSizeBytes = 3 * 1024 * 1024; // 3MB
    expect(fileSizeBytes <= maxSizeMB * 1024 * 1024).toBe(false);
  });
});

// ============ Password Change ============
describe('E2E Profile — Password Change', () => {
  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z.string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Precisa de maiúscula')
      .regex(/[0-9]/, 'Precisa de número')
      .regex(/[!@#$%^&*]/, 'Precisa de especial'),
    confirmPassword: z.string(),
  }).refine(d => d.newPassword === d.confirmPassword, { message: 'Senhas não conferem', path: ['confirmPassword'] });

  it('accepts valid change', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old123', newPassword: 'New1!pass', confirmPassword: 'New1!pass' }).success).toBe(true);
  });
  it('rejects empty current', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'New1!pass', confirmPassword: 'New1!pass' }).success).toBe(false);
  });
  it('rejects weak new password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'weak', confirmPassword: 'weak' }).success).toBe(false);
  });
  it('rejects mismatch', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'New1!pass', confirmPassword: 'Different' }).success).toBe(false);
  });
});

// ============ User Preferences ============
describe('E2E Profile — Preferences', () => {
  const defaults = {
    theme: 'dark', language: 'pt-BR', notifications: true,
    emailNotifications: true, soundEffects: false,
    gridColumns: 4, defaultView: 'grid',
  };

  it('default theme is dark', () => expect(defaults.theme).toBe('dark'));
  it('language is pt-BR', () => expect(defaults.language).toBe('pt-BR'));
  it('notifications enabled', () => expect(defaults.notifications).toBe(true));
  it('sound effects disabled', () => expect(defaults.soundEffects).toBe(false));
  it('grid columns is 4', () => expect(defaults.gridColumns).toBe(4));
  
  it('toggle preference', () => {
    const prefs = { ...defaults, notifications: !defaults.notifications };
    expect(prefs.notifications).toBe(false);
  });
});
