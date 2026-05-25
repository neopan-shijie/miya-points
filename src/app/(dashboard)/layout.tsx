'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { ProfileCtx } from '@/lib/profile-context';
import Sidebar from '@/components/Sidebar';
import Scoreboard from '@/components/Scoreboard';
import type { Profile } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileScoreboardOpen, setMobileScoreboardOpen] = useState(false);
  const initRef = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (!supabaseRef.current) return;

    (async () => {
      try {
        const { data: { session } } = await supabaseRef.current!.auth.getSession();
        if (!session) {
          console.log('[Dashboard] No local session, redirecting to /');
          window.location.href = '/';
          return;
        }

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

  const closeAll = useCallback(() => {
    setMobileMenuOpen(false);
    setMobileScoreboardOpen(false);
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

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-[#1E1B4B] to-[#2D1B69] flex items-center justify-between px-4 z-30 shadow-lg">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-white text-xl p-1"
            aria-label="菜单"
          >
            ☰
          </button>
          <div className="text-sm font-extrabold bg-gradient-to-r from-[#FF6B35] via-[#FF4081] to-[#7C4DFF] bg-clip-text text-transparent">
            🎀 MIYA潮玩社
          </div>
          <button
            onClick={() => setMobileScoreboardOpen(true)}
            className="text-white text-xl p-1"
            aria-label="排行榜"
          >
            🏆
          </button>
        </div>

        {/* Backdrop overlay */}
        {(mobileMenuOpen || mobileScoreboardOpen) && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={closeAll}
          />
        )}

        {/* Sidebar - desktop: fixed column, mobile: left drawer */}
        <aside
          className={`z-50 flex flex-col md:relative md:w-[220px] md:min-w-[220px] fixed inset-y-0 left-0 w-[280px] bg-gradient-to-b from-[#1E1B4B] to-[#2D1B69] transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        >
          <button
            onClick={closeAll}
            className="md:hidden absolute top-4 right-4 text-white/60 hover:text-white text-lg z-10"
            aria-label="关闭菜单"
          >
            ✕
          </button>
          <Sidebar displayName={profile.display_name} onNavigate={closeAll} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 pt-20 md:p-6 bg-[#F5F3FF]">
          <div className="max-w-[900px] mx-auto">
            {children}
          </div>
        </main>

        {/* Scoreboard - desktop: fixed column, mobile: right drawer */}
        <aside
          className={`z-50 flex flex-col md:relative md:w-[300px] md:min-w-[300px] fixed inset-y-0 right-0 w-[300px] bg-white border-l border-gray-100 transition-transform duration-300 ease-in-out ${mobileScoreboardOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}
        >
          <button
            onClick={closeAll}
            className="md:hidden self-end p-3 text-gray-400 hover:text-gray-600 text-lg"
            aria-label="关闭排行榜"
          >
            ✕
          </button>
          <Scoreboard roomId={profile.room_id} />
        </aside>

      </div>
    </ProfileCtx.Provider>
  );
}
