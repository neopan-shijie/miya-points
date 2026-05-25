'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useProfile } from '@/lib/profile-context';
import { useToast } from '@/components/Toast';
import type { Player, Prize } from '@/types';

export default function ManagePage() {
  const profile = useProfile();
  const supabase = createClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<'prizes' | 'players'>('prizes');
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from('prizes').select('*').eq('room_id', profile.room_id).order('points');
      const { data: p } = await supabase.from('players').select('*').eq('room_id', profile.room_id).order('total_points', { ascending: false });
      if (r) setPrizes(r);
      if (p) setPlayers(p);
    })();
  }, [profile.room_id, supabase]);

  const updatePrize = async (id: string, field: string, value: string | number) => {
    const { error } = await supabase.from('prizes').update({ [field]: value }).eq('id', id).eq('room_id', profile.room_id);
    if (error) toast(error.message, 'danger');
    else {
      setPrizes(prizes.map(p => p.id === id ? { ...p, [field]: value } : p));
      toast('已更新');
    }
  };

  const deletePrize = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await supabase.from('prizes').update({ is_active: false }).eq('id', id);
    setPrizes(prizes.filter(p => p.id !== id));
    toast('已删除');
  };

  const addPrize = async () => {
    const name = prompt('商品名');
    if (!name) return;
    const pts = parseFloat(prompt('单价积分') || '');
    if (isNaN(pts)) return;
    const { data } = await supabase.from('prizes').insert({ room_id: profile.room_id, name: name.trim(), points: pts }).select().single();
    if (data) setPrizes([...prizes, data]);
    toast('已添加');
  };

  const updatePlayer = async (id: string, name: string) => {
    if (!name.trim()) return;
    const { error } = await supabase.from('players').update({ name: name.trim() }).eq('id', id);
    if (error) toast(error.message, 'danger');
    else { setPlayers(players.map(p => p.id === id ? { ...p, name: name.trim() } : p)); toast('已更新'); }
  };

  // We need a player name edit function that handles change events
  const handlePlayerNameChange = (id: string, name: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name } : p));
  };

  const deletePlayer = async (id: string) => {
    if (!confirm('删除玩家不会删除交易记录。确定？')) return;
    await supabase.from('players').delete().eq('id', id);
    setPlayers(players.filter(p => p.id !== id));
    toast('已删除');
  };

  const addPlayer = async () => {
    const name = prompt('玩家昵称');
    if (!name) return;
    const { data } = await supabase.from('players').insert({ room_id: profile.room_id, name: name.trim() }).select().single();
    if (data) setPlayers([...players, data]);
    toast('已添加');
  };

  return (
    <div className="animate-[fadeInUp_0.35s_ease]">
      <h1 className="text-[1.4rem] font-extrabold mb-5 flex items-center gap-2.5">
        <span className="w-[5px] h-7 rounded-sm bg-gradient-to-r from-[#FF6B35] to-[#FF4081]" />
        ⚙ 数据管理
      </h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-full">
        <button onClick={() => setTab('prizes')}
          className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${tab === 'prizes' ? 'bg-white text-[#FF6B35] shadow-sm' : 'bg-transparent text-gray-500'}`}>
          📦 商品管理
        </button>
        <button onClick={() => setTab('players')}
          className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${tab === 'players' ? 'bg-white text-[#FF6B35] shadow-sm' : 'bg-transparent text-gray-500'}`}>
          👥 玩家管理
        </button>
      </div>

      {tab === 'prizes' ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold">商品清单 ({prizes.length})</span>
            <button onClick={addPrize}
              className="px-4 py-2 rounded-full text-xs font-semibold border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors">
              + 新增商品
            </button>
          </div>
          <div className="scroll-table">
            <table className="data-table">
              <thead><tr><th>商品名称</th><th>单价(积分)</th><th>操作</th></tr></thead>
              <tbody>
                {prizes.map(p => (
                  <tr key={p.id}>
                    <td>
                      <input defaultValue={p.name} onBlur={e => updatePrize(p.id, 'name', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm w-full focus:border-[#FF6B35] outline-none" />
                    </td>
                    <td>
                      <input type="number" defaultValue={p.points} onBlur={e => updatePrize(p.id, 'points', parseFloat(e.target.value) || 0)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm w-24 focus:border-[#FF6B35] outline-none" />
                    </td>
                    <td>
                      <button onClick={() => deletePrize(p.id)}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold">玩家名单 ({players.length})</span>
            <button onClick={addPlayer}
              className="px-4 py-2 rounded-full text-xs font-semibold border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors">
              + 新增玩家
            </button>
          </div>
          <div className="scroll-table">
            <table className="data-table">
              <thead><tr><th>玩家昵称</th><th>当前积分</th><th>操作</th></tr></thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>
                      <input defaultValue={p.name} onChange={e => handlePlayerNameChange(p.id, e.target.value)}
                        onBlur={e => updatePlayer(p.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm w-full focus:border-[#FF6B35] outline-none" />
                    </td>
                    <td className="font-bold">{p.total_points.toFixed(0)}分</td>
                    <td>
                      <button onClick={() => deletePlayer(p.id)}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
