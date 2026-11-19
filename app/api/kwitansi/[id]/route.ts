import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Konteks = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const penerima =
    typeof body.penerima === "string" && body.penerima.trim() !== ""
      ? body.penerima.trim()
      : null;
  try {
    const kwitansi = await prisma.kwitansi.update({
      where: { id },
      data: { penerima },
    });
    return NextResponse.json(kwitansi);
  } catch {
    return NextResponse.json(
      { error: "Kwitansi tidak ditemukan." },
      { status: 404 }
    );
  }
}
