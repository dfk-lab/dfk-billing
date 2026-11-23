import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESI, verifikasiToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Route khusus ADMIN — PETUGAS diblokir
const TERLARANG_PETUGAS = [
  "/pengaturan",
  "/laporan",
  "/api/pengaturan",
  "/api/upload",
  "/api/otomatis",
  "/api/backup-otomatis",
  "/api/cadangan",
];

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_SESI)?.value;
  const sesi = token ? await verifikasiToken(token) : null;
  if (!sesi) {
    const url = new URL("/login", request.url);
    url.searchParams.set("dari", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  const pengguna = await prisma.pengguna.findUnique({
    where: { id: sesi.penggunaId },
    select: { aktif: true },
  });
  if (!pengguna?.aktif) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Akun dinonaktifkan. Hubungi ADMIN." },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (sesi.role !== "ADMIN") {
    const path = request.nextUrl.pathname;
    const terlarang = TERLARANG_PETUGAS.some(
      (p) => path === p || path.startsWith(p + "/")
    );
    if (terlarang) {
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Hanya ADMIN yang dapat mengakses fitur ini." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|api/logo|_next|favicon.ico|.*\\..*).*)"],
};
