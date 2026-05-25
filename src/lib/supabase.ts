import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  // Only cache on the client side where localStorage is available.
  // During SSR, always return a fresh client — the SSR client can't
  // access localStorage, and reusing it post-hydration causes auth loops.
  if (typeof window !== 'undefined') {
    if (client) return client;
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    return client;
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
