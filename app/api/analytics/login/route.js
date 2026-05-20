import { NextResponse } from 'next/server';

export async function POST(request) {
  const { username, password } = await request.json().catch(() => ({}));

  if (
    username === process.env.ANALYTICS_USER &&
    password === process.env.ANALYTICS_PASSWORD
  ) {
    const from = request.nextUrl.searchParams.get('from') || '/analytics';
    const response = NextResponse.redirect(new URL(from, request.url));
    response.cookies.set('vanta_analytics_session', process.env.ANALYTICS_SESSION_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
