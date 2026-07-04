import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "finance-token";

const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets).*)"],
};
