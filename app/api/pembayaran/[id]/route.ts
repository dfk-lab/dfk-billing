import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Konteks = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  try {
    await prisma.pembayaran.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Pembayaran tidak ditemukan." },
      { status: 404 }
    );
  }
}
