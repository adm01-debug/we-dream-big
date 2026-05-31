import { readFileSync } from 'fs';
import { join } from 'path';

const CLIENT_PATH = join(process.cwd(), 'src/integrations/supabase/client.ts');
const CANONICAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
const CANONICAL_URL = `https://${CANONICAL_PROJECT_ID}.supabase.co`;

console.log('🚀 Validating Supabase Canonical Connection Configuration...');

try {
  const content = readFileSync(CLIENT_PATH, 'utf-8');

  // 1. Check if the canonical URL constant exists and matches
  const hasCanonicalUrl = content.includes(CANONICAL_URL);
  if (!hasCanonicalUrl) {
    console.error(`❌ ERROR: Canonical URL "${CANONICAL_URL}" not found in ${CLIENT_PATH}`);
    process.exit(1);
  }

  // 2. Check if the fallback logic is present
  // It should check if envUrl includes the canonical ID
  const hasFallbackLogic = content.includes('.includes("doufsxqlfjyuvxuezpln")');
  if (!hasFallbackLogic) {
    console.error(`❌ ERROR: Enforcement logic for "${CANONICAL_PROJECT_ID}" not found in ${CLIENT_PATH}`);
    process.exit(1);
  }

  // 3. Ensure SUPABASE_URL is assigned using the validation logic
  const hasCorrectAssignment = content.includes('export const SUPABASE_URL = envMatchesCanonical ? (envUrl as string) : CANONICAL_URL;');
  if (!hasCorrectAssignment) {
    console.error(`❌ ERROR: SUPABASE_URL assignment does not enforce canonical fallback in ${CLIENT_PATH}`);
    process.exit(1);
  }

  console.log('✅ Supabase Canonical Connection is strictly enforced.');
} catch (error) {
  console.error('❌ Failed to read or validate Supabase client configuration:', error.message);
  process.exit(1);
}
