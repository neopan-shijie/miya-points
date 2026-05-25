'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useProfile } from '@/lib/profile-context';
import PlayerChip from '@/components/PlayerChip';
import PrizeChip from '@/components/PrizeChip';
import { useToast } from '@/components/Toast';
import type { Player, Prize } from '@/types';

export default function RedeemPage() {
  const profile = useProfile();
  const supabase = createClient();
  const { toast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [selPlayer, setSelPlayer] = useState<Player | null>(null);
  const [selPrize, setSelPrize] = useState<Prize | null>(null);
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('players').select('*').eq('room_id', profile.room_id).order('total_points', { ascending: false });
      const { data: r } = await supabase.from('prizes').select('*').eq('room_id', profile.room_id).eq('is_active', true).order('points');
      if (p) setPlayers(p);
      if (r) setPrizes(r);
    })();
  }, [profile.room_id, supabase]);

  const balance = selPlayer?.total_points ?? 0;
  const cost = selPrize ? selPrize.points * qty : 0;
  const remaining = balance - cost;
  const canAfford = (prize: Prize) => balance >= prize.points;

  const handleRedeem = async () => {
    if (!selPlayer || !selPrize) { toast('请选择玩家和奖品', 'warning'); return; }
    if (remaining < 0) { toast('积分不足', 'danger'); return; }

    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify([{ playerId: selPlayer.id, prizeId: selPrize.id, quantity: qty, type: 'redeem', note: null }]),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.success) {
      toast(`已从 ${selPlayer.name} 扣除 -${cost.toFixed(0)} 分`, 'danger');
      setSelPrize(null); setQty(1);
      // Refresh
      const { data: p } = await supabase.from('players').select('*').eq('room_id', profile.room_id).order('total_points', { ascending: false });
      if (p) setPlayers(p);
    } else {
      toast(data.results?.[0]?.error || '兑换失败', 'danger');
    }
  };

  return (
    <div className="animate-[fadeInUp_0.35s_ease]">
      <h1 className="text-[1.4rem] font-extrabold mb-5 flex items-center gap-2.5">
        <span className="w-[5px] h-7 rounded-sm bg-gradient-to-r from-[#FF6B35] to-[#FF4081]" />
        🎁 积分兑换
      </h1>

      {/* Players */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="font-bold text-sm text-[#1E1B4B] mb-4">👤 选择玩家</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
          {players.map((p, i) => (
            <PlayerChip key={p.id} id={p.id} name={p.name} points={p.total_points}
              selected={selPlayer?.id === p.id} index={i}
              onClick={() => { setSelPlayer(p); setSelPrize(null); }} />
          ))}
        </div>
      </div>

      {/* Balance banner */}
      {selPlayer && (
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF4081] text-white py-5 px-6 rounded-2xl mb-5 text-center">
          <div className="text-sm opacity-90">{selPlayer.name} 当前积分</div>
          <div className="text-4xl font-extrabold leading-tight">{balance.toFixed(0)} 分</div>
        </div>
      )}

      {/* Prizes */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="font-bold text-sm text-[#1E1B4B] mb-4">🎁 选择兑换奖品</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
          {prizes.map((p, i) => (
            <PrizeChip key={p.id} id={p.id} name={p.name} points={p.points}
              selected={selPrize?.id === p.id} index={i}
              unaffordable={selPlayer ? !canAfford(p) : false}
              onClick={() => setSelPrize(p)} />
          ))}
        </div>
      </div>

      {/* Redeem controls */}
      {selPlayer && selPrize && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="font-semibold text-sm">数量</span>
            <div className="flex items-center bg-[#F5F3FF] rounded-full overflow-hidden">
              <button onClick={() => qty > 1 && setQty(qty - 1)} className="w-11 h-11 bg-transparent text-xl font-bold hover:bg-black/5">−</button>
              <span className="w-14 text-center font-extrabold text-lg">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-11 h-11 bg-transparent text-xl font-bold hover:bg-black/5">+</button>
            </div>
            <div className="text-2xl font-extrabold text-[#EF4444]">-{cost.toFixed(0)} 分</div>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            兑换后剩余: <b className={remaining < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}>{remaining.toFixed(0)}</b> 分
          </div>

          <button onClick={handleRedeem} disabled={submitting || remaining < 0}
            className="w-full h-14 rounded-full bg-gradient-to-r from-[#EF4444] to-[#F87171] text-white text-lg font-extrabold hover:shadow-[0_8px_28px_rgba(239,68,68,0.45)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {submitting ? '兑换中...' : '确认兑换 💎'}
          </button>
        </div>
      )}
    </div>
  );
}
