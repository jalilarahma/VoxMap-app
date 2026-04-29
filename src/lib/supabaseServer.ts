import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with Service Role Key
// Bypasses RLS — use ONLY in API routes, never in client components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getServerSupabase() {
  // Prefer service role key for server operations
  // Falls back to anon key if service role not configured yet
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!serviceRoleKey) {
    console.warn("[supabaseServer] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key");
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
