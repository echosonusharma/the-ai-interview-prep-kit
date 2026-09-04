import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const sid = request.cookies.get("sid");
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (!sid && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (sid && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
