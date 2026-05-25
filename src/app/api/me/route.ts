import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');

    // Parse JWT to get user ID
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

    // Query profiles with service_role key (bypasses RLS)
    const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`;

    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    const body = await res.text();

    if (!res.ok) {
      return NextResponse.json({
        error: 'Supabase error',
        status: res.status,
        detail: body,
        userId,
      }, { status: 500 });
    }

    const data = JSON.parse(body);
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Profile not found', userId }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', detail: e?.message || String(e) }, { status: 500 });
  }
}
