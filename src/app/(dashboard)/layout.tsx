'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { ProfileCtx } from '@/lib/profile-context';
import Sidebar from '@/components/Sidebar';
import Scoreboard from '@/components/Scoreboard';
import type { Profile } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState(false);
  const initRef = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  // Create the Supabase client only on the client side
  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (!supabaseRef.current) return;

    (async () => {
      try {
        // First check local session (no network call) to avoid redirect loop
        const { data: { session } } = await supabaseRef.current!.auth.getSession();
        if (!session) {
          console.log('[Dashboard] No local session, redirecting to /');
          window.location.href = '/';
          return;
        }

        // Get profile via API (bypasses RLS issues)
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          console.log('[Dashboard] Profile API failed:', res.status);
          window.location.href = '/';
          return;
        }
        const p = await res.json();
        setProfile(p);
      } catch (e) {
        console.error('[Dashboard] Auth check error:', e);
        setError(true);
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3FF]">
        <div className="text-center">
          <div className="text-6xl mb-4">😵</div>
          <div className="text-[#7C4DFF] font-bold mb-4">加载失败</div>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF4081] text-white font-bold"
          >
            返回登录
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3FF]">
        <div className="text-4xl animate-bounce mb-4">🎀</div>
      </div>
    );
  }

  return (
    <ProfileCtx.Provider value={profile}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar displayName={profile.display_name} />
        <main className="flex-1 overflow-y-auto p-6 bg-[#F5F3FF]">
          <div className="max-w-[900px] mx-auto">
            {children}
          </div>
        </main>
        <Scoreboard roomId={profile.room_id} />
      </div>
    </ProfileCtx.Provider>
  );
}
