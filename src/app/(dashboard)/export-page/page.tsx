'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useProfile } from '@/lib/profile-context';
import { useToast } from '@/components/Toast';

export default function ExportPage() {
  const profile = useProfile();
  const supabase = createClient();
  const { toast } = useToast();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const exportDetail = async () => {
    setExporting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/transactions', {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const txs = await res.json();

    if (!Array.isArray(txs)) { toast('获取数据失败', 'danger'); setExporting(false); return; }

    let filtered = txs;
    if (from) filtered = filtered.filter((t: { created_at: string }) => t.created_at >= from);
    if (to) filtered = filtered.filter((t: { created_at: string }) => t.created_at <= to + 'T23:59:59');

    const { data: players } = await supabase.from('players').select('*').eq('room_id', profile.room_id);

    // Dynamic import SheetJS
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const detailRows = filtered.map((t: { created_at: string; player?: { name: string }; prize?: { name: string }; quantity: number; type: string; points_change: number; unit_points: number }) => ({
      '日期': t.created_at?.slice(0, 10),
      '玩家': t.player?.name || '-',
      '奖品': t.prize?.name || '-',
      '数量': t.quantity,
      '类型': t.type === 'add' ? '获得积分' : '兑换扣除',
      '变动积分': t.points_change,
      '单价': t.unit_points,
    }));

    const summaryRows = (players || []).map((p: { name: string; total_points: number }) => ({
      '玩家昵称': p.name,
      '当前总积分': p.total_points,
    })).sort((a: { '当前总积分': number }, b: { '当前总积分': number }) => b['当前总积分'] - a['当前总积分']);

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), '积分变动明细');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), '玩家积分汇总');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `MIYA积分管家_${dateStr}.xlsx`);
    toast('导出成功');
    setExporting(false);
  };

  const exportSummary = async () => {
    setExporting(true);
    const { data: players } = await supabase.from('players').select('*').eq('room_id', profile.room_id);

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const rows = (players || []).map((p: { name: string; total_points: number }) => ({
      '玩家昵称': p.name,
      '当前总积分': p.total_points,
    })).sort((a: { '当前总积分': number }, b: { '当前总积分': number }) => b['当前总积分'] - a['当前总积分']);

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '玩家积分汇总');
    XLSX.writeFile(wb, `MIYA积分管家_汇总_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast('导出成功');
    setExporting(false);
  };

  return (
    <div className="animate-[fadeInUp_0.35s_ease]">
      <h1 className="text-[1.4rem] font-extrabold mb-5 flex items-center gap-2.5">
        <span className="w-[5px] h-7 rounded-sm bg-gradient-to-r from-[#FF6B35] to-[#FF4081]" />
        📎 数据导出
      </h1>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="font-bold text-sm text-[#1E1B4B] mb-4">导出选项</div>
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div>
            <label className="font-semibold text-xs">从:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="ml-2 px-3 py-2 rounded-full border-2 border-gray-200 text-sm" />
          </div>
          <div>
            <label className="font-semibold text-xs">到:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="ml-2 px-3 py-2 rounded-full border-2 border-gray-200 text-sm" />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={exportDetail} disabled={exporting}
            className="flex-1 h-14 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF4081] text-white font-extrabold hover:scale-[1.02] transition-all">
            📊 导出明细
          </button>
          <button onClick={exportSummary} disabled={exporting}
            className="flex-1 h-14 rounded-full bg-gradient-to-b from-[#1E1B4B] to-[#2D1B69] text-white font-extrabold hover:scale-[1.02] transition-all">
            📋 导出汇总
          </button>
        </div>
      </div>
    </div>
  );
}
