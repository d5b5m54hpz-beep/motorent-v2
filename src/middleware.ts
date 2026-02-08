import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Public routes - always allow
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/login-admin" ||
    pathname.startsWith("/motos") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public")
  ) {
    return NextResponse.next();
  }

  // Admin routes - require ADMIN role
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login-admin", req.url));
    }
    if (token.role !== "ADMIN" && token.role !== "OPERADOR") {
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
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
