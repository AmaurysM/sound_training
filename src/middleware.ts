// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/landing'];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const userRole = payload.role as string;
    const userId = payload.id as string; // trainee's own ID

    // Redirect trainees to their own training page
    if (userRole === 'Trainee') {
      const traineePath = `/dashboard/train/${userId}`;
      if (!pathname.startsWith(traineePath)) {
        return NextResponse.redirect(new URL(traineePath, req.url));
      }
    }

    // Prevent non-trainees from accessing trainee pages
    if (userRole !== 'Trainee' && userRole !== 'Coordinator' && pathname.startsWith('/dashboard/train')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/landing'],
};
