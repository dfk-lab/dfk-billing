import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buatSesi, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { nama?: unknown; password?: unknown };
  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!nama || password.length < 6) {
    return NextResponse.json(
      { error: "Nama wajib diisi dan password minimal 6 karakter." },
      { status: 400 }
    );
  }
  const jumlah = await prisma.pengguna.count();
  if (jumlah > 0) {
    return NextResponse.json({ error: "Akun admin sudah ada." }, { status: 409 });
  }
  const pengguna = await prisma.pengguna.create({
    data: { nama, passwordHash: hashPassword(password), role: "ADMIN" },
  });
  await buatSesi(pengguna);
  return NextResponse.json({ ok: true });
}
