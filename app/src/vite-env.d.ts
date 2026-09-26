/// <reference types="vite/client" />

// Public build-time variables (VITE_ prefix = shipped to the browser). Both empty → bundled city data only.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
