import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health", "/_next", "/favicon.ico", "/public"];

const ROLE_PATHS: Record<string, string[]> = {
  "/dashboard/admin": ["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"],
  "/dashboard/teacher": ["TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN"],
  "/dashboard/student": ["STUDENT"],
  "/dashboard/parent": ["PARENT"],
  "/dashboard/finance": ["ACCOUNTANT", "SUPER_ADMIN", "SCHOOL_ADMIN"],
  "/dashboard/library": ["LIBRARIAN", "SUPER_ADMIN", "SCHOOL_ADMIN"],
  "/dashboard/reception": ["RECEPTIONIST", "SUPER_ADMIN", "SCHOOL_ADMIN"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get token from JWT (works in edge runtime)
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  // Redirect unauthenticated users
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as string;

  // Check role-based access
  for (const [path, roles] of Object.entries(ROLE_PATHS)) {
    if (pathname.startsWith(path) && !roles.includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
