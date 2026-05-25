import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

function getEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  };
}

/** Authenticate via cookies (SSR) */
export async function getServerProfile() {
  const { url, anonKey } = getEnv();
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(ts) { ts.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return profile;
}

/**
 * Authenticate via Authorization: Bearer <token> header.
 * Used by client-side API calls where the session is in localStorage, not cookies.
 */
export async function getProfileFromToken(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // Parse JWT to get user ID
  let userId: string;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    userId = payload.sub;
    if (!userId) return null;
  } catch {
    return null;
  }

  // Read profile with admin client (bypasses RLS)
  const { url, serviceKey } = getEnv();
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return profile;
}

/**
 * Try both auth methods: cookies first, then Bearer token.
 */
export async function getProfileFromRequest(request: Request) {
  // Try cookie-based auth first
  const cookieProfile = await getServerProfile();
  if (cookieProfile) return cookieProfile;

  // Fall back to Bearer token
  return getProfileFromToken(request);
}
