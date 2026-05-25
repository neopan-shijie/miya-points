'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useProfile } from '@/lib/profile-context';
import PlayerChip from '@/components/PlayerChip';
import PrizeChip from '@/components/PrizeChip';
import { useToast } from '@/components/Toast';
import type { Player, Prize, BatchItem } from '@/types';

export default function QuickEntryPage() {
  const profile = useProfile();
  const supabase = createClient();
  const { toast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [selPlayer, setSelPlayer] = useState<Player | null>(null);
  const [selPrize, setSelPrize] = useState<Prize | null>(null);
  const [qty, setQty] = useState(1);
  const [entryType, setEntryType] = useState<'add' | 'redeem'>('add');
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: p } = await supabase.from('players').select('*').eq('room_id', profile.room_id).order('total_points', { ascending: false });
      const { data: r } = await supabase.from('prizes').select('*').eq('room_id', profile.room_id).eq('is_active', true).order('points');
      if (p) setPlayers(p);
      if (r) setPrizes(r);
    };
    fetch();
  }, [profile.room_id, supabase]);

  const pointsChange = selPrize ? qty * selPrize.points * (entryType === 'redeem' ? -1 : 1) : 0;

  const handleSubmit = async () => {
    if (!selPlayer || !selPrize) { toast('请选择玩家和奖品', 'warning'); return; }
    if (entryType === 'redeem') {
      const player = players.find(p => p.id === selPlayer.id);
      if (player && player.total_points + pointsChange < 0) { toast('积分不足', 'danger'); return; }
    }

    const item: BatchItem = {
      playerId: selPlayer.id, playerName: selPlayer.name,
      prizeId: selPrize.id, prizeName: selPrize.name,
      quantity: qty, type: entryType,
      pointsChange, unitPoints: selPrize.points,
    };

    if (batchMode) {
      setBatchQueue([...batchQueue, item]);
      toast(`已加入队列: ${item.playerName} ${pointsChange >= 0 ? '+' : ''}${pointsChange.toFixed(0)}分`);
      setQty(1);
    } else {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify([{
          playerId: item.playerId, prizeId: item.prizeId,
          quantity: item.quantity, type: item.type, note: null,
        }]),
      });
      const data = await res.json();
      setSubmitting(false);
      if (data.success) {
        toast(`${item.playerName} ${pointsChange >= 0 ? '+' : ''}${pointsChange.toFixed(0)}分`);
        setQty(1);
        // Refresh players
        const { data: p } = await supabase.from('players').select('*').eq('room_id', profile.room_id).order('total_points', { ascending: false });
        if (p) setPlayers(p);
      } else {
        toast(data.results?.[0]?.error || '提交失败', 'danger');
      }
    }
  };

  const handleBatchSubmit = async () => {
    if (batchQueue.length === 0) return;
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(batchQueue.map(b => ({
        playerId: b.playerId, prizeId: b.prizeId,
        quantity: b.quantity, type: b.type, note: null,
      }))),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) {
      toast(`成功提交 ${batchQueue.length} 条记录`);
      setBatchQueue([]);
      const { data: p } = await supabase.from('players').select('*').eq('room_id', profile.room_id).order('total_points', { ascending: false });
      if (p) setPlayers(p);
    }
  };

  return (
    <div className="animate-[fadeInUp_0.35s_ease]">
      <h1 className="text-[1.4rem] font-extrabold mb-5 flex items-center gap-2.5">
        <span className="w-[5px] h-7 rounded-sm bg-gradient-to-r from-[#FF6B35] to-[#FF4081]" />
        ⚡ 快捷录入
      </h1>

      {/* Batch toggle */}
      <div className="flex items-center gap-2.5 text-xs text-gray-500 mb-3 select-none">
        <span className="font-semibold">📋 批量模式</span>
        <button
          onClick={() => { setBatchMode(!batchMode); setBatchQueue([]); }}
          className={`w-[52px] h-7 rounded-2xl relative transition-all flex-shrink-0 ${batchMode ? 'bg-[#7C4DFF] shadow-[0_0_12px_rgba(124,77,255,0.4)]' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-[22px] h-[22px] rounded-full bg-white shadow transition-all ${batchMode ? 'left-[27px]' : 'left-[3px]'}`} />
        </button>
        <span className={batchMode ? 'text-[#7C4DFF] font-semibold' : 'text-gray-400'}>
          {batchMode ? '已开启' : '已关闭'}
        </span>
      </div>

      {/* Players */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="font-bold text-sm text-[#1E1B4B] mb-4">👤 选择玩家</div>
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
          {players.map((p, i) => (
            <PlayerChip key={p.id} id={p.id} name={p.name} points={p.total_points}
              selected={selPlayer?.id === p.id} index={i}
              onClick={() => setSelPlayer(p)} />
          ))}
        </div>
      </div>

      {/* Prizes */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="font-bold text-sm text-[#1E1B4B] mb-4">🎁 选择奖品</div>
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
          {prizes.map((p, i) => (
            <PrizeChip key={p.id} id={p.id} name={p.name} points={p.points}
              selected={selPrize?.id === p.id} index={i}
              onClick={() => setSelPrize(p)} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="font-semibold text-sm">数量</span>
          <div className="flex items-center bg-[#F5F3FF] rounded-full overflow-hidden">
            <button onClick={() => qty > 0.5 && setQty(Math.round((qty - 0.5) * 10) / 10)}
              className="w-11 h-11 bg-transparent text-xl font-bold hover:bg-black/5 transition-colors">−</button>
            <span className="w-14 text-center font-extrabold text-lg tabular-nums">{qty}</span>
            <button onClick={() => setQty(Math.round((qty + 0.5) * 10) / 10)}
              className="w-11 h-11 bg-transparent text-xl font-bold hover:bg-black/5 transition-colors">+</button>
          </div>
          <div className="flex bg-[#F5F3FF] rounded-full p-0.5">
            <button onClick={() => setEntryType('add')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${entryType === 'add' ? 'bg-[#10B981] text-white' : 'bg-transparent text-gray-500'}`}>获得积分</button>
            <button onClick={() => setEntryType('redeem')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${entryType === 'redeem' ? 'bg-[#EF4444] text-white' : 'bg-transparent text-gray-500'}`}>兑换扣除</button>
          </div>
          <div className={`text-2xl font-extrabold px-2 min-w-[140px] ${pointsChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {selPrize ? `${pointsChange >= 0 ? '+' : ''}${pointsChange.toFixed(0)} 分` : '请选奖品'}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full h-14 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF4081] text-white text-lg font-extrabold tracking-wide animate-[pulse-glow_2s_infinite] hover:scale-[1.02] hover:shadow-[0_8px_28px_rgba(255,107,53,0.45)] active:scale-[0.98] transition-all">
          {submitting ? '提交中...' : '确认添加 ✨'}
        </button>

        {/* Batch queue */}
        {batchMode && batchQueue.length > 0 && (
          <div className="mt-3 p-3 bg-[#FEFCE8] rounded-2xl">
            <div className="font-semibold mb-2">📋 待提交队列 ({batchQueue.length}条)</div>
            {batchQueue.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-sm border-b border-dashed border-gray-200 last:border-0">
                <span>{b.playerName} · {b.prizeName} x{b.quantity} {b.type === 'add' ? '➕' : '➖'}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{b.pointsChange >= 0 ? '+' : ''}{b.pointsChange.toFixed(0)}</span>
                  <button onClick={() => setBatchQueue(batchQueue.filter((_, j) => j !== i))}
                    className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors">删</button>
                </div>
              </div>
            ))}
            <button onClick={handleBatchSubmit} disabled={submitting}
              className="w-full h-12 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF4081] text-white font-bold mt-2 hover:scale-[1.02] transition-all">
              📌 提交全部 ({batchQueue.length}条)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
