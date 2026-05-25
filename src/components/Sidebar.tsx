'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const NAV_ITEMS = [
  { path: '/quick-entry', emoji: '⚡', label: '快捷录入' },
  { path: '/redeem', emoji: '🎁', label: '积分兑换' },
  { path: '/records', emoji: '📋', label: '记录明细' },
  { path: '/manage', emoji: '⚙', label: '数据管理' },
  { path: '/export-page', emoji: '📎', label: '数据导出' },
];

export default function Sidebar({ displayName, onNavigate }: { displayName: string; onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) {
      onNavigate?.();
    } else {
      mountedRef.current = true;
    }
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full py-5">
      {/* Brand */}
      <div className="px-5 pb-6 text-center">
        <div className="text-lg font-extrabold bg-gradient-to-r from-[#FF6B35] via-[#FF4081] to-[#7C4DFF] bg-clip-text text-transparent tracking-wide">
          🎀 MIYA潮玩社
        </div>
        <div className="text-xs text-white/50 mt-1">积分管家 v1.0</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-left text-sm font-medium transition-all duration-200
              ${pathname === item.path
                ? 'bg-gradient-to-r from-[#FF6B35] to-[#FF4081] text-white font-bold shadow-[0_0_24px_rgba(255,107,53,0.35)]'
                : 'text-white/60 hover:bg-white/8 hover:text-white'
              }`}
          >
            <span className="text-lg w-6 text-center">{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-5 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-white/80 text-sm mb-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF4081] flex items-center justify-center text-white font-bold text-sm">
            {displayName?.[0]?.toUpperCase() || 'M'}
          </div>
          <span className="truncate">{displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full py-2 rounded-full bg-white/10 text-white/60 text-xs hover:bg-red-500/30 hover:text-red-300 transition-all"
        >
          🚪 退出登录
        </button>
      </div>
    </div>
  );
}
