import { NextResponse } from 'next/server';
import { getProfileFromRequest } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('prizes')
    .select('*')
    .eq('room_id', profile.room_id)
    .eq('is_active', true)
    .order('points', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, points, stock } = await request.json();
  if (!name?.trim() || !points) return NextResponse.json({ error: 'Name and points required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('prizes')
    .insert({ room_id: profile.room_id, name: name.trim(), points: Number(points), stock: stock ?? -1 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, points, stock, is_active } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (points !== undefined) updates.points = Number(points);
  if (stock !== undefined) updates.stock = Number(stock);
  if (is_active !== undefined) updates.is_active = is_active;

  const { error } = await supabase
    .from('prizes')
    .update(updates)
    .eq('id', id)
    .eq('room_id', profile.room_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = createAdminClient();
  // Soft delete
  const { error } = await supabase
    .from('prizes')
    .update({ is_active: false })
    .eq('id', id)
    .eq('room_id', profile.room_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
