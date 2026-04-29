import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client.
// Prefers SERVICE_ROLE_KEY (bypasses RLS) but falls back to the anon key
// if the service-role value is missing OR obviously malformed (wrong
// format, stray non-ASCII chars from a copy-paste accident, etc.).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase JWT keys always start with "eyJ" (base64-encoded JWT header).
// Anything else is either an old "sb_secret_..." style or garbled.
function looksLikeValidKey(k: string | undefined): boolean {
  if (!k) return false;
  // Reject keys with non-ASCII characters (like the U+00F8 ø that crept in)
  if (/[^\x20-\x7E]/.test(k)) return false;
  // Strongly prefer JWT-shaped keys
  if (!k.startsWith("eyJ")) return false;
  return true;
}

export function getServerSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let key: string;

  if (looksLikeValidKey(serviceRoleKey)) {
    key = serviceRoleKey!;
  } else {
    if (serviceRoleKey) {
      console.warn(
        "[supabaseServer] SUPABASE_SERVICE_ROLE_KEY looks malformed — falling back to anon key. " +
        "This usually means the value in your env vars is corrupted (stray characters, wrong format)."
      );
    } else {
      console.warn("[supabaseServer] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key.");
    }
    key = anonKey;
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
