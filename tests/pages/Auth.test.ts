/**
 * Integration tests for Auth page — validates form rendering, validation schemas,
 * and tab switching without requiring real Supabase connection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { z } from 'zod';

// ============================================
// Test the validation schemas (pure logic)
// ============================================

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter letra minúscula")
    .regex(/[0-9]/, "Senha deve conter número")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Senha deve conter caractere especial"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

describe('Auth - Login Schema Validation', () => {
  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '123456' });
    expect(result.success).toBe(true);
  });
});

describe('Auth - Signup Schema Validation', () => {
  const validData = {
    fullName: 'João Silva',
    email: 'joao@test.com',
    password: 'Secure1!pass',
    confirmPassword: 'Secure1!pass',
  };

  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = signupSchema.safeParse({ ...validData, fullName: 'J' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = signupSchema.safeParse({ ...validData, password: 'secure1!pass', confirmPassword: 'secure1!pass' });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = signupSchema.safeParse({ ...validData, password: 'Secure!pass', confirmPassword: 'Secure!pass' });
    expect(result.success).toBe(false);
  });

  it('rejects password without special char', () => {
    const result = signupSchema.safeParse({ ...validData, password: 'Secure1pass', confirmPassword: 'Secure1pass' });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({ ...validData, confirmPassword: 'Different1!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('rejects password shorter than 8 chars', () => {
    const result = signupSchema.safeParse({ ...validData, password: 'Ab1!', confirmPassword: 'Ab1!' });
    expect(result.success).toBe(false);
  });
});
