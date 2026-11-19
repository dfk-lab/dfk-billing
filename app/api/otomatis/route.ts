import { NextResponse } from "next/server";
import { connection } from "next/server";
import {
  buatCadanganOtomatis,
  daftarCadanganOtomatis,
  jalankanInvoiceOtomatis,
  statusOtomatis,
  ubahBackupOtomatisAktif,
} from "@/lib/otomatis";

export async function GET() {
  await connection();
  return NextResponse.json({
    ...(await statusOtomatis()),
    daftar: await daftarCadanganOtomatis(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    aksi?: string;
    aktif?: boolean;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (body.aksi === "ubahBackupAktif") {
    const aktif = await ubahBackupOtomatisAktif(body.aktif === true);
    return NextResponse.json({ ok: true, backupOtomatisAktif: aktif });
  }

  if (body.aksi === "invoice") {
    const hasil = await jalankanInvoiceOtomatis();
    return NextResponse.json({ ok: true, ...hasil });
  }

  if (body.aksi === "backup") {
    const nama = await buatCadanganOtomatis();
    return NextResponse.json({ ok: true, nama });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
}
