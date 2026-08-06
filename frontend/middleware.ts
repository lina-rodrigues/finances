import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "finance-token";

const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proxied backend routes — auth cookies are set here; must not redirect to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const hasToken = request.cookies.has(AUTH_COOKIE);
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasToken && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasToken && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|webawesome|api/).*)"],
};
