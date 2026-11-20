import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ambilSesi, hashPassword } from "@/lib/auth";

type Konteks = { params: Promise<{ id: string }> };

async function wajibAdmin() {
  const sesi = await ambilSesi();
  if (!sesi || sesi.role !== "ADMIN") return null;
  return sesi;
}

export async function PATCH(request: Request, { params }: Konteks) {
  const sesi = await wajibAdmin();
  if (!sesi) {
    return NextResponse.json(
      { error: "Hanya ADMIN yang dapat mengakses fitur ini." },
      { status: 403 }
    );
  }
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body.nama === "string" && body.nama.trim()) {
    data.nama = body.nama.trim();
  }
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }
    data.passwordHash = hashPassword(body.password);
  }
  if (body.role === "ADMIN" || body.role === "PETUGAS") {
    if (id === sesi.penggunaId && body.role !== sesi.role) {
      return NextResponse.json(
        { error: "Tidak bisa mengubah role sendiri." },
        { status: 400 }
      );
    }
    data.role = body.role;
  }
  if (typeof body.aktif === "boolean") {
    if (id === sesi.penggunaId && !body.aktif) {
      return NextResponse.json(
        { error: "Tidak bisa menonaktifkan akun sendiri." },
        { status: 400 }
      );
    }
    data.aktif = body.aktif;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  try {
    const pengguna = await prisma.pengguna.update({
      where: { id },
      data,
      select: { id: true, nama: true, role: true, aktif: true, createdAt: true },
    });
    return NextResponse.json(pengguna);
  } catch {
    return NextResponse.json(
      { error: "Pengguna tidak ditemukan." },
      { status: 404 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Konteks) {
  const sesi = await wajibAdmin();
  if (!sesi) {
    return NextResponse.json(
      { error: "Hanya ADMIN yang dapat mengakses fitur ini." },
      { status: 403 }
    );
  }
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  if (id === sesi.penggunaId) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri." },
      { status: 400 }
    );
  }
  const sisaAdmin = await prisma.pengguna.count({
    where: { role: "ADMIN", id: { not: id } },
  });
  if (sisaAdmin === 0) {
    return NextResponse.json(
      { error: "Minimal harus tersisa satu ADMIN." },
      { status: 400 }
    );
  }
  try {
    await prisma.pengguna.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Pengguna tidak ditemukan." },
      { status: 404 }
    );
  }
}
