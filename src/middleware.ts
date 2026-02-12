import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Use NextAuth v5 auth() wrapper instead of getToken() for proper
// cookie/secret resolution behind reverse proxies (Railway)
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes - always allow
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/login-admin" ||
    pathname.startsWith("/motos") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/debug")
  ) {
    return NextResponse.next();
  }

  // Admin routes - require ADMIN role
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login-admin", req.url));
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "OPERADOR") {
      return NextResponse.redirect(new URL("/login-admin", req.url));
    }
    return NextResponse.next();
  }

  // Protected client routes
  if (
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/alquiler") ||
    pathname.startsWith("/pago")
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
