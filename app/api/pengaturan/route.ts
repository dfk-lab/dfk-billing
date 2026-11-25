import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { hapusBerkasUrl } from "@/lib/upload";
import { parseHariPengingat } from "@/lib/otomatis";

const stringFields = [
  "namaUsaha",
  "namaPemilik",
  "alamat",
  "telepon",
  "email",
  "logo",
  "namaBank",
  "noRekening",
  "atasNamaRekening",
  "gambarQris",
  "gambarTandaTangan",
  "footerDokumen",
  "catatanKwitansi",
  "prefixInvoice",
  "prefixKwitansi",
  "waApiUrl",
  "waApiUser",
  "waNomorAdmin",
  "waTemplateTagihan",
  "waTemplateKwitansi",
  "midtransMode",
  "midtransApiUrl",
  "urlPublik",
] as const;

const rahasia = ["waApiPassword", "midtransServerKey"] as const;

function sanitasi(setting: unknown) {
  const s = setting as Record<string, unknown>;
  const { waApiPassword, midtransServerKey, ...aman } = s;
  return {
    ...aman,
    waApiPasswordTersimpan: typeof waApiPassword === "string" && waApiPassword !== "",
    midtransServerKeyTersimpan:
      typeof midtransServerKey === "string" && midtransServerKey.trim() !== "",
  };
}

function ambilData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const field of stringFields) {
    if (typeof body[field] === "string") {
      data[field] = (body[field] as string).trim();
    }
  }
  // Kredensial rahasia hanya berubah bila diisi — kosong/tidak dikirim berarti tetap.
  for (const field of rahasia) {
    const nilai = body[field];
    if (typeof nilai === "string" && nilai.trim() !== "") {
      data[field] = nilai.trim();
    }
  }
  if (body.ppnDefault !== undefined) {
    const n = Number(body.ppnDefault);
    if (!Number.isNaN(n) && n >= 0 && n <= 100) {
      data.ppnDefault = n;
    }
  }
  if (body.jatuhTempoHari !== undefined) {
    const n = Number(body.jatuhTempoHari);
    if (Number.isInteger(n) && n >= 0 && n <= 365) {
      data.jatuhTempoHari = n;
    }
  }
  if (body.waAktif !== undefined) {
    data.waAktif = body.waAktif === true || body.waAktif === "true";
  }
  if (body.waPengingatPelangganAktif !== undefined) {
    data.waPengingatPelangganAktif =
      body.waPengingatPelangganAktif === true ||
      body.waPengingatPelangganAktif === "true";
  }
  if (typeof body.waPengingatHari === "string") {
    data.waPengingatHari = parseHariPengingat(body.waPengingatHari).join(",");
  }
  if (body.waPengingatJam !== undefined) {
    const n = Number(body.waPengingatJam);
    if (Number.isInteger(n) && n >= 0 && n <= 23) {
      data.waPengingatJam = n;
    }
  }
  if (body.midtransAktif !== undefined) {
    data.midtransAktif =
      body.midtransAktif === true || body.midtransAktif === "true";
  }
  if (typeof body.midtransMode === "string") {
    const mode = body.midtransMode.trim();
    if (mode === "sandbox" || mode === "produksi") {
      data.midtransMode = mode;
    }
  }
  return data;
}

export async function GET() {
  const sesi = await wajibAdmin();
  if (!sesi) {
    return NextResponse.json(
      { error: "Hanya ADMIN yang dapat mengakses fitur ini." },
      { status: 403 }
    );
  }
  await connection();
  let setting = await prisma.setting.findFirst();
  if (!setting) {
    setting = await prisma.setting.create({ data: {} });
  }
  return NextResponse.json(sanitasi(setting));
}

export async function PUT(request: Request) {
  const sesi = await wajibAdmin();
  if (!sesi) {
    return NextResponse.json(
      { error: "Hanya ADMIN yang dapat mengubah pengaturan." },
      { status: 403 }
    );
  }
  const body = (await request.json()) as Record<string, unknown>;
  const data = ambilData(body);
  const existing = await prisma.setting.findFirst();
  const lama = existing as unknown as Record<string, unknown> | null;
  for (const kunci of ["logo", "gambarTandaTangan", "gambarQris"]) {
    const nilaiLama = lama?.[kunci];
    if (
      typeof nilaiLama === "string" &&
      nilaiLama.startsWith("/api/berkas/") &&
      data[kunci] !== nilaiLama
    ) {
      hapusBerkasUrl(nilaiLama);
    }
  }
  const setting = existing
    ? await prisma.setting.update({ where: { id: existing.id }, data })
    : await prisma.setting.create({ data });
  return NextResponse.json(sanitasi(setting));
}
