import { NextResponse } from 'next/server';

// Login is handled client-side via supabase.auth.signInWithPassword
// This route is reserved for additional login logic if needed
export async function POST() {
  return NextResponse.json({ message: 'Use client-side supabase.auth.signInWithPassword' });
}
