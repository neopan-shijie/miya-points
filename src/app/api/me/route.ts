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
    let roomId: string;

    // Check if any rooms exist
    const roomsRes = await sb('/rest/v1/rooms?select=*&limit=1');
    const rooms = await roomsRes.json();

    if (Array.isArray(rooms) && rooms.length > 0) {
      roomId = rooms[0].id;
    } else {
      // Create a room
      const createRoom = await sb('/rest/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ name: 'MIYA潮玩社', slug: `room-${userId.slice(0, 8)}`, owner_id: userId }),
      });
      const newRooms = await createRoom.json();
      roomId = Array.isArray(newRooms) ? newRooms[0].id : newRooms.id;
    }

    // Get user email from auth
    const userRes = await sb(`/auth/v1/admin/users/${userId}`);
    const user = await userRes.json();
    const displayName = user.email?.split('@')[0] || '用户';

    // Create profile
    const createProfile = await sb('/rest/v1/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ id: userId, display_name: displayName, role: 'operator', room_id: roomId }),
    });
    const newProfiles = await createProfile.json();

    return NextResponse.json(Array.isArray(newProfiles) ? newProfiles[0] : newProfiles);
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', detail: e?.message || String(e) }, { status: 500 });
  }
}
