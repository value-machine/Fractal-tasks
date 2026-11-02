/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string; // Legacy: still supported for backward compatibility
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string; // Preferred: use publishable key from Supabase dashboard
  /** Optional override of the error-report environment tag; normally derived (see features/error-reporting). */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Git branch of the build (`WORKERS_CI_BRANCH` on Cloudflare Workers Builds), or "". Defined in vite.config.ts. */
declare const __BUILD_BRANCH__: string | undefined;
