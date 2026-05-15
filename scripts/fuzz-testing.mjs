import fs from 'fs';
import path from 'path';

/**
 * Fuzz Testing script for project endpoints.
 * Generates random data to test resilience.
 */

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const payloads = [
  { cnpj: generateRandomString(50) },
  { email: generateRandomString(100) },
  { mockup_id: generateRandomString(10), data: { colors: [generateRandomString(1000)] } },
  { query: "' OR '1'='1" }, // SQLi attempt
  { script: "<script>alert(1)</script>" }, // XSS attempt
];

async function runFuzz() {
  console.log("🚀 Starting Fuzz Testing...");
  
  for (const payload of payloads) {
    console.log(`Testing with payload: ${JSON.stringify(payload)}`);
    // In a real environment, we would use fetch to send these to local or dev endpoints
    // For now, we simulate the validation logic if possible or just log the intent
  }
  
  console.log("✅ Fuzz Testing completed (Simulated).");
}

runFuzz().catch(console.error);
