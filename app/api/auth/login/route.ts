import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buatSesi, cocokPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
  }
  const pengguna = await prisma.pengguna.findFirst();
  if (!pengguna || !cocokPassword(password, pengguna.passwordHash)) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }
  await buatSesi(pengguna.id);
  return NextResponse.json({ ok: true });
}
