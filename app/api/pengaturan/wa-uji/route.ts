import { NextResponse } from "next/server";
import { kirimWa } from "@/lib/wa";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const nomor = typeof body.nomor === "string" ? body.nomor : "";
  if (!nomor.trim()) {
    return NextResponse.json(
      { ok: false, pesan: "Isi nomor admin WhatsApp terlebih dahulu." },
      { status: 400 }
    );
  }
  const hasil = await kirimWa(
    nomor,
    "*DFK Billing*\n\nUji kirim berhasil. Notifikasi WhatsApp siap digunakan.",
    {
      aktif: true,
      url: typeof body.url === "string" ? body.url : undefined,
      user: typeof body.user === "string" ? body.user : undefined,
      pass: typeof body.pass === "string" ? body.pass : undefined,
    }
  );
  return NextResponse.json(hasil, { status: hasil.ok ? 200 : 400 });
}
