import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/analytics/login') return NextResponse.next();

  const session = request.cookies.get('vanta_analytics_session')?.value;
  if (session !== process.env.ANALYTICS_SESSION_SECRET) {
    const loginUrl = new URL('/analytics/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/analytics/:path*'],
};
