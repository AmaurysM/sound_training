// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/landing", "/register"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  // Verify JWT if token exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch (err) {
      console.error("JWT verification failed:", err);
    }
  }

  // Normalize role (just in case)
  const userRole = payload?.role ? String(payload.role).toLowerCase() : null;
  const userId = payload?.id;

  // ✅ Allow all users (even coordinators) to access public pages when not logged in
  if (!payload && PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ✅ Redirect logged-in users away from public pages
  if (payload && PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    if (userRole === "trainee") {
      return NextResponse.redirect(
        new URL(`/dashboard/train/${userId}`, req.url)
      );
    }
    // Trainer or Coordinator
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ✅ Protect private routes: redirect unauthenticated users
  if (!payload && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ✅ Trainee-specific route protection
  if (userRole === "trainee") {
    const traineePath = `/dashboard/train/${userId}`;
    const modulePath = "/dashboard/module/";

    const isOwnDashboard = pathname.startsWith(traineePath);
    const isModulePage = pathname.startsWith(modulePath);

    // Redirect trainees trying to access other dashboards
    if (
      pathname.startsWith("/dashboard") &&
      !isOwnDashboard &&
      !isModulePage
    ) {
      return NextResponse.redirect(new URL(traineePath, req.url));
    }
  }

  // ✅ Allow coordinators/trainers full dashboard access
  if (userRole === "coordinator" || userRole === "trainer") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/landing",
    "/register",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
