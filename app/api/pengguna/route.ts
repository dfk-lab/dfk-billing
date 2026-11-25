import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, wajibAdmin } from "@/lib/auth";

export async function GET() {
  const sesi = await wajibAdmin();
  if (!sesi) {
    return NextResponse.json(
      { error: "Hanya ADMIN yang dapat mengakses fitur ini." },
      { status: 403 }
    );
  }
  const daftar = await prisma.pengguna.findMany({
    select: {
      id: true,
      nama: true,
      role: true,
      aktif: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(daftar);
}

export async function POST(request: Request) {
  const sesi = await wajibAdmin();
  if (!sesi) {
    return NextResponse.json(
      { error: "Hanya ADMIN yang dapat mengakses fitur ini." },
      { status: 403 }
    );
  }
  const body = (await request.json()) as Record<string, unknown>;
  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "PETUGAS" ? "PETUGAS" : "ADMIN";
  if (!nama || password.length < 8) {
    return NextResponse.json(
      { error: "Nama wajib diisi dan password minimal 8 karakter." },
      { status: 400 }
    );
  }
  const ada = await prisma.pengguna.findFirst({ where: { nama } });
  if (ada) {
    return NextResponse.json(
      { error: "Nama pengguna sudah dipakai." },
      { status: 409 }
    );
  }
  const pengguna = await prisma.pengguna.create({
    data: { nama, passwordHash: hashPassword(password), role },
    select: { id: true, nama: true, role: true, aktif: true, createdAt: true },
  });
  return NextResponse.json(pengguna, { status: 201 });
}
