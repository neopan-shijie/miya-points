import { NextResponse } from 'next/server';
import { getProfileFromRequest } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase-server';

// GET: list transactions with filters
export async function GET(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from('transactions')
    .select('*, player:players(name), prize:prizes(name)')
    .eq('room_id', profile.room_id)
    .order('created_at', { ascending: false })
    .limit(200);

  const playerId = searchParams.get('playerId');
  const date = searchParams.get('date');
  const type = searchParams.get('type');

  if (playerId) query = query.eq('player_id', playerId);
  if (date) query = query.eq('created_at', date);
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST: create a new transaction
export async function POST(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();

  // Support single or batch
  const items = Array.isArray(body) ? body : [body];

  const results = [];
  for (const item of items) {
    const { playerId, prizeId, quantity, type, note, sessionId } = item;

    // Get prize info
    const { data: prize } = await supabase
      .from('prizes')
      .select('points, name')
      .eq('id', prizeId)
      .single();

    if (!prize) {
      results.push({ error: `Prize ${prizeId} not found` });
      continue;
    }

    const unitPoints = prize.points;
    const pointsChange = quantity * unitPoints * (type === 'redeem' ? -1 : 1);

    // Get player name
    const { data: player } = await supabase
      .from('players')
      .select('name')
      .eq('id', playerId)
      .single();

    // Check balance for redemptions
    if (type === 'redeem' && player) {
      const { data: p } = await supabase
        .from('players')
        .select('total_points')
        .eq('id', playerId)
        .single();
      if (p && p.total_points + pointsChange < 0) {
        results.push({ error: '积分不足' });
        continue;
      }
    }

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        room_id: profile.room_id,
        player_id: playerId,
        prize_id: prizeId,
        operator_id: profile.id,
        session_id: sessionId || null,
        type,
        quantity,
        points_change: pointsChange,
        unit_points: unitPoints,
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      results.push({ error: error.message });
    } else {
      results.push(tx);
    }
  }

  return NextResponse.json({ success: true, results });
}

// DELETE: undo a transaction
export async function DELETE(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('room_id', profile.room_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
