import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');

    const parts = token.split('.');
    if (parts.length !== 3) return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });

    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      userId = payload.sub;
      if (!userId) throw new Error('No sub');
    } catch {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!key) {
      return NextResponse.json({ error: 'No service key configured' }, { status: 500 });
    }

    const sb = (path: string, init?: RequestInit) =>
      fetch(`${supabaseUrl}${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, ...init?.headers },
        ...init,
      });

    // Query profiles
    const profileRes = await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`);
    const profiles = await profileRes.json();

    if (Array.isArray(profiles) && profiles.length > 0) {
      return NextResponse.json(profiles[0]);
    }

    // Profile not found — auto-create room + profile
    // Get user email from auth
    const userRes = await sb(`/auth/v1/admin/users/${userId}`);
    const user = await userRes.json();
    const displayName = user.email?.split('@')[0] || '用户';

    // Always create a new room for the user
    const createRoom = await sb('/rest/v1/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ name: 'MIYA潮玩社', slug: `room-${userId.slice(0, 8)}`, owner_id: userId }),
    });
    const newRooms = await createRoom.json();
    const roomId = Array.isArray(newRooms) ? newRooms[0].id : newRooms.id;

    // Create profile as owner
    const createProfile = await sb('/rest/v1/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ id: userId, display_name: displayName, role: 'owner', room_id: roomId }),
    });
    const newProfiles = await createProfile.json();

    // Seed default prizes and players
    const defaultPrizes = [
      { name: '哭哭熊吊卡', points: 450 }, { name: '初生白吊卡', points: 280 },
      { name: '心愿星(60积分)', points: 60 }, { name: '比奇堡1.0盲盒', points: 85 },
      { name: '比奇堡2.0盲盒', points: 90 }, { name: '落日歌会盲盒', points: 85 },
      { name: '冰淇淋盲盒', points: 89 }, { name: '哭娃度假盲盒', points: 129 },
      { name: 'Molly挂链盲盒', points: 79 }, { name: '鱼尾狮', points: 250 },
      { name: '大夏日', points: 450 }, { name: '烘培师中娃', points: 240 },
      { name: '金虎扭蛋(泰国限定)', points: 1100 }, { name: '小饼干', points: 69 },
      { name: '心底密码', points: 78 }, { name: '哭娃巡游盲盒', points: 135 },
      { name: '初生棕吊卡', points: 680 }, { name: '植绒兔吊卡', points: 400 },
    ];
    const defaultPlayers = [
      '玩家01', '玩家02', '玩家03', '玩家04', '玩家05',
      '玩家06', '玩家07', '玩家08', '玩家09',
    ];
    for (const p of defaultPrizes) {
      await sb('/rest/v1/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ room_id: roomId, name: p.name, points: p.points }),
      });
    }
    for (const name of defaultPlayers) {
      await sb('/rest/v1/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ room_id: roomId, name }),
      });
    }

    return NextResponse.json(Array.isArray(newProfiles) ? newProfiles[0] : newProfiles);
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', detail: e?.message || String(e) }, { status: 500 });
  }
}
