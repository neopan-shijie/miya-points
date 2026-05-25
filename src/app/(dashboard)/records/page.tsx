'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useProfile } from '@/lib/profile-context';
import { useToast } from '@/components/Toast';
import type { Transaction, Player } from '@/types';

export default function RecordsPage() {
  const profile = useProfile();
  const supabase = createClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPlayerId, setFilterPlayerId] = useState('');

  useEffect(() => {
    const pid = searchParams.get('player');
    if (pid) setFilterPlayerId(pid);
  }, [searchParams]);

  // Load player list
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/players', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPlayers(Array.isArray(data) ? data : []);
      }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterDate) params.set('date', filterDate);
    if (filterType) params.set('type', filterType);
    if (filterPlayerId) params.set('playerId', filterPlayerId);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/transactions?${params.toString()}`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const data = await res.json();
    if (Array.isArray(data)) setTxs(data);
  }, [filterDate, filterType, filterPlayerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('确认撤销此条记录？')) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/transactions?id=${id}`, {
      method: 'DELETE',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const data = await res.json();
    if (data.success) { toast('已撤销'); fetchData(); }
    else { toast(data.error || '撤销失败', 'danger'); }
  };

  const total = txs.reduce((s, t) => s + t.points_change, 0);
  const today = new Date().toISOString().slice(0, 10);
  const selectedName = players.find(p => p.id === filterPlayerId)?.name;

  return (
    <div className="animate-[fadeInUp_0.35s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <h1 className="text-[1.4rem] font-extrabold flex items-center gap-2.5">
          <span className="w-[5px] h-7 rounded-sm bg-gradient-to-r from-[#FF6B35] to-[#FF4081]" />
          📋 积分变动明细
          {selectedName && (
            <span className="text-base font-normal text-gray-400 ml-2">— {selectedName}</span>
          )}
        </h1>
        <div>
          <span className="text-sm text-gray-400 mr-2">累计变动</span>
          <span className={`text-xl font-extrabold tabular-nums ${total >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {total > 0 ? '+' : ''}{total.toFixed(0)}分
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={filterPlayerId}
          onChange={e => setFilterPlayerId(e.target.value)}
          className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium bg-white focus:border-[#7C4DFF] outline-none transition-colors min-w-[140px]"
        >
          <option value="">全部玩家</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium bg-white focus:border-[#7C4DFF] outline-none transition-colors"
        />
        <button
          onClick={() => setFilterDate(today)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            filterDate === today
              ? 'bg-[#7C4DFF] text-white'
              : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >今天</button>
        <button
          onClick={() => setFilterDate('')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            !filterDate
              ? 'bg-[#7C4DFF] text-white'
              : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >全部</button>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium bg-white focus:border-[#7C4DFF] outline-none transition-colors"
        >
          <option value="">全部类型</option>
          <option value="add">获得积分</option>
          <option value="redeem">兑换扣除</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {txs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📭</div>
            <div className="text-base font-semibold">暂无记录</div>
            <div className="text-sm mt-2">完成一笔操作后将显示在此处</div>
          </div>
        ) : (
          <div className="scroll-table">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider border border-gray-200">日期</th>
                  <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider border border-gray-200">玩家</th>
                  <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider border border-gray-200">奖品</th>
                  <th className="text-center py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider border border-gray-200">数量</th>
                  <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider border border-gray-200">类型</th>
                  <th className="text-right py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider border border-gray-200">积分变动</th>
                  <th className="text-center py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider border border-gray-200">操作</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(t => (
                  <tr key={t.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="py-3.5 px-5 text-gray-500 border border-gray-200">{t.created_at?.slice(0, 10)}</td>
                    <td className="py-3.5 px-5 font-semibold text-gray-800 border border-gray-200">{t.player?.name || '-'}</td>
                    <td className="py-3.5 px-5 text-gray-700 border border-gray-200">{t.prize?.name || '-'}</td>
                    <td className="py-3.5 px-5 text-center text-gray-500 border border-gray-200">×{t.quantity}</td>
                    <td className="py-3.5 px-5 border border-gray-200">
                      {t.type === 'add' ? (
                        <span className="inline-block px-3 py-1 rounded-md bg-green-50 text-green-600 text-xs font-bold">获得</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-md bg-red-50 text-red-500 text-xs font-bold">扣除</span>
                      )}
                    </td>
                    <td className={`py-3.5 px-5 text-right font-bold tabular-nums border border-gray-200 ${
                      t.points_change >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}>
                      {t.points_change > 0 ? '+' : ''}{t.points_change}
                    </td>
                    <td className="py-3.5 px-5 text-center border border-gray-200">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-gray-400 hover:text-red-500 hover:underline transition-colors"
                      >撤销</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
