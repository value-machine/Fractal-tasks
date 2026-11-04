import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** Supabase types for the rest of the app (this file is the only @supabase import site). */
export type { AuthError, User as SupabaseUser } from "@supabase/supabase-js";
export type SupabaseAuth = SupabaseClient["auth"];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Support both publishable key (new) and anon key (legacy) for backward compatibility
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Placeholder values (test bypass + `.env.example`) that mean "not configured". */
const PLACEHOLDER_VALUES = new Set([
  "https://test-local.supabase.co",
  "test-anon-key-for-local-testing",
  "your-project-url",
  "your-anon-key",
  "your-publishable-key",
]);

let supabase: SupabaseClient | null = null;

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = (): boolean =>
  Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !PLACEHOLDER_VALUES.has(supabaseUrl) &&
    !PLACEHOLDER_VALUES.has(supabaseAnonKey)
  );

/**
 * Get Supabase client, created lazily (throws if not configured)
 */
export const getSupabase = (): SupabaseClient => {
  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Authentication requires Supabase environment variables."
    );
  }

  supabase ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use PKCE flow for better security and CORS compatibility
      flowType: "pkce",
    },
  });

  return supabase;
};

// Create the client on module load so it can pick up an OAuth session from the URL early
if (isSupabaseConfigured()) {
  getSupabase();
}

/** Connection details for calling a Supabase Edge Function over plain fetch. */
export interface EdgeFunctionConfig {
  /** `<project url>/functions/v1/<name>` without a trailing slash. */
  baseUrl: string;
  /** `apikey` + bearer headers using the publishable key. */
  headers: Record<string, string>;
}

/**
 * Returns the base URL and public headers for an Edge Function, or null when Supabase is not
 * configured. For functions that expose their own HTTP API (the Supabase client cannot route those).
 */
export const getEdgeFunctionConfig = (name: string): EdgeFunctionConfig | null => {
  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) return null;
  return {
    baseUrl: `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/${name}`,
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
  };
};
