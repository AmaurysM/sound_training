// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/landing'];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;

  // Check if user is trying to access public paths (login/landing)
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    // If user is already logged in, redirect away from login/landing
    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        const { payload } = await jwtVerify(token, secret);
        const userRole = payload.role as string;
        const userId = payload.id as string;

        // Redirect based on role
        if (userRole === 'Trainee') {
          return NextResponse.redirect(new URL(`/dashboard/train/${userId}`, req.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      } catch (err) {
        // Invalid token, let them access login page
        console.error('JWT verification failed on public path:', err);
        return NextResponse.next();
      }
    }
    // No token, allow access to public paths
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const userRole = payload.role as string;
    const userId = payload.id as string;

    // Redirect trainees to their own training page
    if (userRole === 'Trainee') {
      const traineePath = `/dashboard/train/${userId}`;
      
      // If trainee tries to access dashboard or any other path, redirect to their training page
      if (!pathname.startsWith(traineePath)) {
        return NextResponse.redirect(new URL(traineePath, req.url));
      }
    }

    // Trainers can access:
    // - /dashboard (main dashboard)
    // - /dashboard/train/:id (any trainee's training page)
    if (userRole === 'Trainer') {
      // Block access to non-trainee user pages (like /dashboard/train/[trainerId])
      if (pathname.startsWith('/dashboard/train/')) {
        // Extract the user ID from the path
        const pathUserId = pathname.split('/')[3];
        
        // Verify this is actually a trainee (you might want to add a user lookup here)
        // For now, just allow all /dashboard/train/* access for trainers
        // You could add additional validation by checking the user's role from database
      }
    }

    // Coordinators have full access to all routes
    // No additional checks needed for coordinators

    // Block trainers from accessing pages they shouldn't
    if (userRole === 'Trainer' && pathname.match(/^\/dashboard\/(users|settings|admin)/)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    // Clear the invalid token and redirect to login
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.set({
      name: 'token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/landing',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};