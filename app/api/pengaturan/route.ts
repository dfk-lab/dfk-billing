import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { hapusBerkasUrl } from "@/lib/upload";

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
  "waApiPassword",
  "waNomorAdmin",
  "waTemplateTagihan",
  "waTemplateKwitansi",
  "midtransServerKey",
  "midtransMode",
  "midtransApiUrl",
] as const;

function ambilData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const field of stringFields) {
    if (typeof body[field] === "string") {
      data[field] = (body[field] as string).trim();
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
  await connection();
  let setting = await prisma.setting.findFirst();
  if (!setting) {
    setting = await prisma.setting.create({ data: {} });
  }
  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
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
  return NextResponse.json(setting);
}
