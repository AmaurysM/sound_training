// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/landing'];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;

  // If user has a token, verify it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch (err) {
      console.error('JWT verification failed:', err);
    }
  }

  // Redirect logged-in users away from login/landing pages
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path)) && payload) {
    const userRole = payload.role as string;
    const userId = payload.id as string;

    if (userRole === 'Trainee') {
      return NextResponse.redirect(new URL(`/dashboard/train/${userId}`, req.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Protect all other routes: require authentication
  if (!payload && !PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Handle trainee-specific routing
  if (payload?.role === 'Trainee') {
    const traineePath = `/dashboard/train/${payload.id}`;
    const modulePath = '/dashboard/module/';
    
    // Allow trainees to access:
    // 1. Their own training dashboard
    // 2. Module detail pages
    const isOwnDashboard = pathname.startsWith(traineePath);
    const isModulePage = pathname.startsWith(modulePath);
    
    if (!isOwnDashboard && !isModulePage && pathname.startsWith('/dashboard')) {
      // Redirect to their training dashboard if trying to access other areas
      return NextResponse.redirect(new URL(traineePath, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/landing',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};