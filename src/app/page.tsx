'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const initRef = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  useEffect(() => {
    if (initRef.current || !supabaseRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const { data: { user } } = await supabaseRef.current!.auth.getUser();
        if (user) {
          window.location.href = '/quick-entry';
          return;
        }
      } catch { /* session check failed, show login */ }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F5F3FF]">
        <div className="text-4xl animate-bounce">🎀</div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('请填写邮箱和密码'); return; }
    setLoading(true);

    if (mode === 'login') {
      const { error: loginError } = await supabaseRef.current!.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(loginError.message === 'Invalid login credentials' ? '邮箱或密码错误' : loginError.message);
        setLoading(false);
      } else {
        window.location.href = '/quick-entry';
      }
    } else {
      if (!displayName || !roomName) { setError('请填写所有字段'); setLoading(false); return; }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, roomName }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); }
      else {
        await supabaseRef.current!.auth.signInWithPassword({ email, password });
        window.location.href = '/quick-entry';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-[32px] p-10 px-8 w-[420px] shadow-[0_24px_60px_rgba(0,0,0,0.3)] text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B35] via-[#FF4081] to-[#7C4DFF]" />
        <div className="text-5xl mb-3">🧸</div>
        <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-[#FF6B35] via-[#FF4081] to-[#7C4DFF] bg-clip-text text-transparent">
          {mode === 'login' ? '登录 MIYA 积分管家' : '注册新账号'}
        </h3>

        <input type="email" placeholder="邮箱" value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full my-2.5 px-4 py-3.5 rounded-full border-2 border-gray-200 text-sm focus:border-[#FF6B35] outline-none transition-colors" />
        <input type="password" placeholder="密码" value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full my-2.5 px-4 py-3.5 rounded-full border-2 border-gray-200 text-sm focus:border-[#FF6B35] outline-none transition-colors" />

        {mode === 'register' && (
          <>
            <input type="text" placeholder="你的称呼" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full my-2.5 px-4 py-3.5 rounded-full border-2 border-gray-200 text-sm focus:border-[#FF6B35] outline-none transition-colors" />
            <input type="text" placeholder="直播间名称" value={roomName}
              onChange={e => setRoomName(e.target.value)}
              className="w-full my-2.5 px-4 py-3.5 rounded-full border-2 border-gray-200 text-sm focus:border-[#FF6B35] outline-none transition-colors" />
          </>
        )}

        <div className="text-sm text-[#EF4444] my-2 min-h-5">{error}</div>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3.5 rounded-full font-bold text-base text-white bg-gradient-to-r from-[#FF6B35] to-[#FF4081] hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(255,107,53,0.35)] transition-all disabled:opacity-60">
          {loading ? '处理中...' : mode === 'login' ? '进入系统' : '立即注册'}
        </button>

        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="w-full py-3 mt-3 rounded-full font-semibold text-sm text-[#FF6B35] border-2 border-[#FF6B35] bg-transparent hover:bg-orange-50 transition-all">
          {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
        </button>
      </div>
    </div>
  );
}
