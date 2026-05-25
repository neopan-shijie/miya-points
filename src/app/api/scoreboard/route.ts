import { NextResponse } from 'next/server';
import { getProfileFromRequest } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: players } = await supabase
    .from('players')
    .select('id, name, total_points')
    .eq('room_id', profile.room_id)
    .order('total_points', { ascending: false });

  const { data: todayTx } = await supabase
    .from('transactions')
    .select('points_change')
    .eq('room_id', profile.room_id)
    .gte('created_at', today)
    .lt('created_at', today + 'T23:59:59');

  const todayNet = todayTx?.reduce((s, t) => s + t.points_change, 0) ?? 0;

  return NextResponse.json({ players, todayNet });
}
