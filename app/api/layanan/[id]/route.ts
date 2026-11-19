import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dataLayanan } from "@/lib/layanan";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const layananId = Number(id);
  if (!Number.isInteger(layananId)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const { error, data } = dataLayanan(body);
  if (error.length > 0) {
    return NextResponse.json({ error: error.join(" ") }, { status: 400 });
  }
  try {
    const layanan = await prisma.layanan.update({
      where: { id: layananId },
      data,
    });
    return NextResponse.json(layanan);
  } catch {
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const layananId = Number(id);
  if (!Number.isInteger(layananId)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  try {
    await prisma.layanan.delete({ where: { id: layananId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Layanan masih dipakai di invoice. Hapus invoice-nya dulu." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 }
    );
  }
}
