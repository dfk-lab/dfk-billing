import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ambilSesi, cocokPassword, hashPassword } from "@/lib/auth";

export async function PUT(request: Request) {
  const sesi = await ambilSesi();
  if (!sesi) {
    return NextResponse.json({ error: "Tidak masuk." }, { status: 401 });
  }
  const body = (await request.json()) as {
    passwordLama?: unknown;
    passwordBaru?: unknown;
  };
  const passwordLama =
    typeof body.passwordLama === "string" ? body.passwordLama : "";
  const passwordBaru =
    typeof body.passwordBaru === "string" ? body.passwordBaru : "";
  if (!passwordLama || passwordBaru.length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter." },
      { status: 400 }
    );
  }
  const pengguna = await prisma.pengguna.findUnique({
    where: { id: sesi.penggunaId },
  });
  if (!pengguna || !cocokPassword(passwordLama, pengguna.passwordHash)) {
    return NextResponse.json({ error: "Password lama salah." }, { status: 400 });
  }
  await prisma.pengguna.update({
    where: { id: pengguna.id },
    data: { passwordHash: hashPassword(passwordBaru) },
  });
  return NextResponse.json({ ok: true });
}
