import { NextResponse } from "next/server";
import { catatPesanWa, kirimWa } from "@/lib/wa";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const nomor = typeof body.nomor === "string" ? body.nomor : "";
  if (!nomor.trim()) {
    return NextResponse.json(
      { ok: false, pesan: "Isi nomor admin WhatsApp terlebih dahulu." },
      { status: 400 }
    );
  }
  const teksUji =
    "*DFK Billing*\n\nUji kirim berhasil. Notifikasi WhatsApp siap digunakan.";
  const hasil = await kirimWa(nomor, teksUji, {
    aktif: true,
    url: typeof body.url === "string" ? body.url : undefined,
    user: typeof body.user === "string" ? body.user : undefined,
    pass: typeof body.pass === "string" ? body.pass : undefined,
  });
  await catatPesanWa(nomor, teksUji, hasil, {
    jenis: "UJI",
    keterangan: "Uji kirim dari Pengaturan",
  });
  return NextResponse.json(hasil, { status: hasil.ok ? 200 : 400 });
}
