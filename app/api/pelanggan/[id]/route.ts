import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dataPelanggan } from "@/lib/pelanggan";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const pelangganId = Number(id);
  if (!Number.isInteger(pelangganId)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const data = dataPelanggan(body);
  if (!data.nama) {
    return NextResponse.json(
      { error: "Nama pelanggan wajib diisi." },
      { status: 400 }
    );
  }
  try {
    const pelanggan = await prisma.pelanggan.update({
      where: { id: pelangganId },
      data,
    });
    return NextResponse.json(pelanggan);
  } catch {
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan." },
      { status: 404 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const pelangganId = Number(id);
  if (!Number.isInteger(pelangganId)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  try {
    await prisma.pelanggan.delete({ where: { id: pelangganId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Pelanggan masih punya invoice. Hapus invoice-nya dulu." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan." },
      { status: 404 }
    );
  }
}
