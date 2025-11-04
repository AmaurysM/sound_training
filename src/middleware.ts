// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Roles } from "./models/types";

const PUBLIC_PATHS = ["/login", "/landing", "/register"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any = null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;

      // ✅ Block archived users - check from JWT payload
      if (payload.archived === true) {
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("token");
        return response;
      }
    } catch (err) {
      console.error("JWT verification failed:", err);
    }
  }

  const userRole = payload?.role ? String(payload.role).toLowerCase() : null;
  const userId = payload?.id;

  // Allow public pages if not logged in
  if (!payload && PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from public pages
  if (payload && PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    if (userRole === Roles.Student.toLowerCase()) {
      return NextResponse.redirect(
        new URL(`/dashboard`, req.url)
      );
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect private routes
  if (!payload && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Trainee-specific route protection
  if (userRole === Roles.Student.toLowerCase()) {
    const traineePath = `/dashboard/users/${userId}/modules`;
    const modulePath = "/dashboard/users/${userId}/modules";

    const isOwnDashboard = pathname.startsWith(traineePath);
    const isModulePage = pathname.startsWith(modulePath);

    if (pathname.startsWith("/dashboard") && !isOwnDashboard && !isModulePage) {
      return NextResponse.redirect(new URL(traineePath, req.url));
    }
  }

  // Coordinators/trainers have full access
  if (
    userRole === Roles.Coordinator.toLowerCase() ||
    userRole === Roles.Trainer.toLowerCase()
  ) {
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