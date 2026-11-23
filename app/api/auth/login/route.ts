import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buatSesi, cocokPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { nama?: unknown; password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  if (!password) {
    return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
  }
  const aktif = await prisma.pengguna.findMany({ where: { aktif: true } });
  const pengguna = nama
    ? aktif.find((u) => u.nama.toLowerCase() === nama.toLowerCase())
    : aktif.length === 1
      ? aktif[0]
      : undefined;
  if (!pengguna) {
    return NextResponse.json(
      {
        error: nama
          ? "Pengguna tidak ditemukan atau nonaktif."
          : "Ada lebih dari satu pengguna. Isi kolom nama pengguna.",
      },
      { status: nama ? 401 : 400 }
    );
  }
  if (!cocokPassword(password, pengguna.passwordHash)) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }
  await buatSesi(pengguna);
  return NextResponse.json({ ok: true });
}
