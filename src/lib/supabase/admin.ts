import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client that uses the secret key, so it bypasses row-level security.
 * Only use it for data that isn't tied to one user, and never with a user's input as the
 * only check. Returns null if the key isn't set.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) return null;

  return createClient<Database>(getSupabaseEnv().url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
