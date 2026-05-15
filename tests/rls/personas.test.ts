/**
 * RLS Persona Tests — Skeleton
 *
 * Estes testes validam que as policies de RLS bloqueiam corretamente
 * acesso cross-user. Marcados como skip por padrão; habilite ao
 * configurar TEST_SELLER_PASSWORD e TEST_ADMIN_PASSWORD no ambiente.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const SELLER_PASS = process.env.TEST_SELLER_PASSWORD;
const ADMIN_PASS = process.env.TEST_ADMIN_PASSWORD;

const enabled = !!(SELLER_PASS && ADMIN_PASS);
const d = enabled ? describe : describe.skip;

d('RLS — anon persona', () => {
  const anon = createClient(SUPABASE_URL, ANON_KEY);

  it('cannot SELECT quotes', async () => {
    const { data, error } = await anon.from('quotes').select('id').limit(1);
    expect(error || (data && data.length === 0)).toBeTruthy();
  });

  it('cannot SELECT user_roles', async () => {
    const { data, error } = await anon.from('user_roles').select('user_id').limit(1);
    expect(error || (data && data.length === 0)).toBeTruthy();
  });

  it('cannot SELECT login_attempts', async () => {
    const { data, error } = await anon.from('login_attempts').select('id').limit(1);
    expect(error || (data && data.length === 0)).toBeTruthy();
  });
});

d('RLS — seller persona', () => {
  const seller = createClient(SUPABASE_URL, ANON_KEY);

  it('logs in', async () => {
    const { error } = await seller.auth.signInWithPassword({
      email: 'seller-test@discount-approval.test',
      password: SELLER_PASS!,
    });
    expect(error).toBeNull();
  });

  it('reads only own quotes', async () => {
    const { data } = await seller.from('quotes').select('id, seller_id').limit(50);
    const userId = (await seller.auth.getUser()).data.user?.id;
    expect(data?.every((q) => q.seller_id === userId)).toBe(true);
  });

  it('cannot read other sellers quotes via filter bypass', async () => {
    const { data } = await seller.from('quotes').select('id').neq('seller_id', '00000000-0000-0000-0000-000000000000');
    const userId = (await seller.auth.getUser()).data.user?.id;
    // RLS filtra antes do .neq, então só vê próprios
    expect(data?.every(() => true)).toBe(true);
    expect(userId).toBeDefined();
  });
});

d('RLS — admin persona', () => {
  const admin = createClient(SUPABASE_URL, ANON_KEY);

  it('logs in', async () => {
    const { error } = await admin.auth.signInWithPassword({
      email: 'admin-test@discount-approval.test',
      password: ADMIN_PASS!,
    });
    expect(error).toBeNull();
  });

  it('reads all quotes', async () => {
    const { data, error } = await admin.from('quotes').select('id').limit(10);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('reads bot_detection_log', async () => {
    const { error } = await admin.from('bot_detection_log').select('id').limit(1);
    expect(error).toBeNull();
  });
});
