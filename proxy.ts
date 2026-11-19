import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESI, verifikasiToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_SESI)?.value;
  const sesi = token ? await verifikasiToken(token) : null;
  if (sesi) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("dari", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/auth|_next|favicon.ico|.*\\..*).*)"],
};
