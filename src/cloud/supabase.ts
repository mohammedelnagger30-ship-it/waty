import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
// Both names are accepted; the publishable key is safe to embed in a build.
const rawKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

/** Never ship a secret key: RLS is the only boundary between accounts. */
function validateConfig(url: string, key: string): void {
  if (!url || !key) throw new Error('Supabase URL or key is missing.');
  if (/YOUR_PROJECT|YOUR_ANON_KEY|CHANGE_ME/i.test(`${url} ${key}`)) {
    throw new Error('Supabase environment values are still placeholders.');
  }
  if (/^sb_secret_/i.test(key)) throw new Error('A secret key must never be bundled in the app.');
  if (/\/rest\/v1/i.test(url)) throw new Error('Use the project base URL, without /rest/v1.');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Supabase URL is not a valid URL.');
  }
  if (parsed.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS.');
}

let client: SupabaseClient | null = null;
let configError: string | null = null;
try {
  validateConfig(rawUrl, rawKey);
  client = createClient(rawUrl, rawKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  // A bad .env must not crash the app: guests can keep using local storage.
  configError = error instanceof Error ? error.message : String(error);
}

export const supabase = client;
export const isCloudConfigured = client !== null;
export { configError };
