import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const { email, password, displayName, roomName } = await request.json();

  if (!email || !password || !displayName || !roomName) {
    return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
  }

  // Admin client (bypasses RLS for registration)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options));
        },
      },
    }
  );

  // 1. Register auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || '注册失败' }, { status: 400 });
  }

  const userId = authData.user.id;

  // 2. Create room (using admin client to bypass RLS)
  const slug = `${roomName.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-')}-${Date.now().toString(36)}`;
  const { data: room, error: roomError } = await adminClient
    .from('rooms')
    .insert({ name: roomName, slug, owner_id: userId })
    .select()
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: roomError?.message || '创建直播间失败' }, { status: 500 });
  }

  // 3. Create profile (using admin client)
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: userId, room_id: room.id, display_name: displayName, role: 'owner' });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 4. Seed default data (using admin client)
  const defaultProducts = [
    { name: '哭哭熊吊卡', points: 450 },
    { name: '初生白吊卡', points: 280 },
    { name: '心愿星(60积分)', points: 60 },
    { name: '比奇堡1.0盲盒', points: 85 },
    { name: '比奇堡2.0盲盒', points: 90 },
    { name: '落日歌会盲盒', points: 85 },
    { name: '冰淇淋盲盒', points: 89 },
    { name: '哭娃度假盲盒', points: 129 },
    { name: 'Molly挂链盲盒', points: 79 },
    { name: '鱼尾狮', points: 250 },
    { name: '大夏日', points: 450 },
    { name: '烘培师中娃', points: 240 },
    { name: '金虎扭蛋(泰国限定)', points: 1100 },
    { name: '小饼干', points: 69 },
    { name: '心底密码', points: 78 },
    { name: '哭娃巡游盲盒', points: 135 },
    { name: '初生棕吊卡', points: 680 },
    { name: '植绒兔吊卡', points: 400 },
  ];

  const defaultPlayers = [
    '小小小小陳', '哼哈小将', '追月', 'Yuki Li', '珠珠🐷宝',
    '遛娃大队长', '肉肉', '欧气Beck', 'Archer',
  ];

  for (const p of defaultProducts) {
    await adminClient.from('prizes').insert({ room_id: room.id, name: p.name, points: p.points });
  }

  for (const name of defaultPlayers) {
    await adminClient.from('players').insert({ room_id: room.id, name });
  }

  return NextResponse.json({ success: true });
}
