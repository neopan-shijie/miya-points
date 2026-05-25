import { NextResponse } from 'next/server';
import { getProfileFromRequest } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', profile.room_id)
    .order('total_points', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('players')
    .insert({ room_id: profile.room_id, name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const profile = await getProfileFromRequest(request);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name } = await request.json();
  if (!id || !name?.trim()) return NextResponse.json({ error: 'id and name required' }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('players')
    .update({ name: name.trim() })
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
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)
    .eq('room_id', profile.room_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
