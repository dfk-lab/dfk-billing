import { NextResponse } from "next/server";
import { waKirimKwitansiKePelanggan } from "@/lib/wa";

type Konteks = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Konteks) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { ok: false, pesan: "ID kwitansi tidak valid." },
      { status: 400 }
    );
  }
  const hasil = await waKirimKwitansiKePelanggan(id);
  return NextResponse.json(hasil, { status: hasil.ok ? 200 : 400 });
}
