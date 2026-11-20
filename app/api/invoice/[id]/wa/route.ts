import { NextResponse } from "next/server";
import { waKirimTagihanKePelanggan } from "@/lib/wa";

type Konteks = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { ok: false, pesan: "ID invoice tidak valid." },
      { status: 400 }
    );
  }
  const hasil = await waKirimTagihanKePelanggan(id);
  return NextResponse.json(hasil, { status: hasil.ok ? 200 : 400 });
}
