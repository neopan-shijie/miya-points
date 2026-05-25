'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface RankedPlayer {
  id: string;
  name: string;
  total_points: number;
  rank: number;
}

export default function Scoreboard({ roomId }: { roomId: string }) {
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [todayNet, setTodayNet] = useState(0);
  const [bounceToday, setBounceToday] = useState(false);
  const [bounceIds, setBounceIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const prevPointsRef = useRef<Map<string, number>>(new Map());

  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    const fetchData = async () => {
      if (!supabaseRef.current) return;
      const { data: { session } } = await supabaseRef.current.auth.getSession();
      if (!session || cancelled) return;

      const res = await fetch('/api/scoreboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok || cancelled) return;

      const data = await res.json();
      if (cancelled) return;

      // Detect changed values for bounce animation
      const changed = new Set<string>();
      (data.players || []).forEach((p: { id: string; total_points: number }) => {
        const prev = prevPointsRef.current.get(p.id);
        if (prev !== undefined && prev !== p.total_points) {
          changed.add(p.id);
        }
        prevPointsRef.current.set(p.id, p.total_points);
      });

      if (data.todayNet !== undefined && data.todayNet !== todayNet) {
        setBounceToday(true);
        setTimeout(() => setBounceToday(false), 600);
      }

      if (changed.size > 0) {
        setBounceIds(changed);
        setTimeout(() => setBounceIds(new Set()), 600);
      }

      setPlayers(
        (data.players || []).map((p: { id: string; name: string; total_points: number }, i: number) => ({
          ...p,
          rank: i + 1,
        }))
      );
      setTodayNet(data.todayNet ?? 0);
    };

    fetchData();

    interval = setInterval(fetchData, 8000);

    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    if (supabaseRef.current) {
      channel = supabaseRef.current
        .channel('scoreboard')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'transactions', filter: `room_id=eq.${roomId}` },
          () => fetchData()
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      channel?.unsubscribe();
    };
  }, [roomId]);

  const medal = (r: number) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-5 text-center border-b border-gray-100">
        <div className="text-base font-bold text-[#1E1B4B]">🏆 实时排行榜</div>
      </div>

      {/* Today stats */}
      <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF4081] text-white py-3 px-5 text-center font-bold text-sm rounded-2xl m-4 shadow-[0_0_24px_rgba(255,107,53,0.35)]">
        <span className={`text-3xl font-extrabold block leading-tight tabular-nums ${bounceToday ? 'animate-[numberBounce_0.5s_ease]' : ''}`}>
          {todayNet.toFixed(0)}
        </span>
        今日新增净积分
      </div>

      {/* Ranking list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {players.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">暂无玩家数据</div>
        ) : (
          players.map((p, i) => {
            const m = medal(p.rank);
            const bounced = bounceIds.has(p.id);
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/records?player=${p.id}`)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer hover:bg-orange-50 hover:translate-x-1 transition-all mb-1"
                style={{ animation: `chipEnter 0.4s ease both ${i * 0.04}s` }}
              >
                <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-extrabold text-sm flex-shrink-0 ${
                  p.rank === 1 ? 'bg-gradient-to-r from-[#FFD600] to-[#FFAB00] text-[#5D4037] shadow-[0_2px_8px_rgba(255,214,0,0.4)]' :
                  p.rank === 2 ? 'bg-gradient-to-r from-[#CFD8DC] to-[#90A4AE] text-[#37474F] shadow-[0_2px_8px_rgba(144,164,174,0.4)]' :
                  p.rank === 3 ? 'bg-gradient-to-r from-[#FF8A65] to-[#E64A19] text-white shadow-[0_2px_8px_rgba(230,74,25,0.4)]' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {m || p.rank}
                </div>
                <span className="flex-1 font-semibold text-sm truncate">{p.name}</span>
                <span className={`font-extrabold text-base text-[#FF6B35] tabular-nums ${bounced ? 'animate-[numberBounce_0.5s_ease]' : ''}`}>
                  {p.total_points.toFixed(0)}分
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
