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
  const pengguna = nama
    ? await prisma.pengguna.findFirst({
        where: { nama, aktif: true },
      })
    : await prisma.pengguna.findFirst({ where: { aktif: true } });
  if (!pengguna) {
    return NextResponse.json(
      { error: nama ? "Pengguna tidak ditemukan atau nonaktif." : "Password salah." },
      { status: 401 }
    );
  }
  if (!cocokPassword(password, pengguna.passwordHash)) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }
  await buatSesi(pengguna);
  return NextResponse.json({ ok: true });
}
