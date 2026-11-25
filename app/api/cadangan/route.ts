import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { dumpCadangan } from "@/lib/cadangan";
import { kodeTagihanBaru } from "@/lib/tagihan";

export async function GET() {
  const sesi = await wajibAdmin();
  if (!sesi) {
    return NextResponse.json(
      { error: "Hanya ADMIN yang dapat mengakses fitur ini." },
      { status: 403 }
    );
  }
  const data = await dumpCadangan();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dfk-billing-cadangan-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}

type Dump = {
  versi?: number;
  setting?: Record<string, unknown>;
  pengguna?: Record<string, unknown>[];
  pelanggan?: Record<string, unknown>[];
  layanan?: Record<string, unknown>[];
  invoice?: Record<string, unknown>[];
  pembayaran?: Record<string, unknown>[];
  kwitansi?: Record<string, unknown>[];
};

export async function POST(request: Request) {
  const sesi = await wajibAdmin();
  if (!sesi) {
    return NextResponse.json(
      { error: "Hanya ADMIN yang dapat memulihkan cadangan." },
      { status: 403 }
    );
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File JSON tidak ditemukan." }, { status: 400 });
  }
  let isi: Dump;
  try {
    isi = JSON.parse(await file.text()) as Dump;
  } catch {
    return NextResponse.json({ error: "File bukan JSON yang valid." }, { status: 400 });
  }
  if (
    !Array.isArray(isi.pelanggan) ||
    !Array.isArray(isi.invoice) ||
    !Array.isArray(isi.pengguna)
  ) {
    return NextResponse.json(
      { error: "Struktur cadangan tidak dikenali — bagian pelanggan, invoice, atau pengguna tidak ada." },
      { status: 400 }
    );
  }
  if (isi.pengguna.length === 0) {
    return NextResponse.json(
      { error: "Cadangan tidak memuat satu pun pengguna — tidak aman dipulihkan karena akan menghapus semua akun." },
      { status: 400 }
    );
  }
  if (
    isi.pengguna.some(
      (p) =>
        typeof p.nama !== "string" ||
        p.nama.trim() === "" ||
        typeof p.passwordHash !== "string" ||
        p.passwordHash.length < 20
    )
  ) {
    return NextResponse.json(
      { error: "Setiap pengguna pada cadangan harus punya nama dan hash password yang valid." },
      { status: 400 }
    );
  }

  const dataSetting = isi.setting as Prisma.SettingUncheckedCreateInput | undefined;
  const dataPengguna = isi.pengguna as Prisma.PenggunaUncheckedCreateInput[];
  const dataPelanggan = isi.pelanggan as Prisma.PelangganUncheckedCreateInput[];
  const dataLayanan = (isi.layanan ?? []) as Prisma.LayananUncheckedCreateInput[];
  const dataPembayaran = (isi.pembayaran ?? []) as Prisma.PembayaranUncheckedCreateInput[];
  const dataKwitansi = (isi.kwitansi ?? []) as Prisma.KwitansiUncheckedCreateInput[];
  const dataInvoice = isi.invoice.map((inv) => {
    const { items, ...utama } = inv as Record<string, unknown>;
    // Cadangan lama: kolom yang sudah dihapus + kodeTagihan yang belum ada
    delete (utama as Record<string, unknown>).waPengingatDikirim;
    const kode = (utama as Record<string, unknown>).kodeTagihan;
    if (typeof kode !== "string" || !/^[0-9a-f]{32}$/.test(kode)) {
      (utama as Record<string, unknown>).kodeTagihan = kodeTagihanBaru();
    }
    const itemsBersih = (Array.isArray(items) ? items : []).map((it) => {
      const { invoiceId, ...tanpaFk } = it as Record<string, unknown>;
      return tanpaFk as Prisma.InvoiceItemUncheckedCreateInput;
    });
    return {
      utama: utama as Prisma.InvoiceUncheckedCreateInput,
      items: itemsBersih,
    };
  });
  if (dataSetting) {
    delete (dataSetting as Record<string, unknown>).lastRunPengingatWa;
  }

  try {
    const hasil = await prisma.$transaction(async (tx) => {
      await tx.kwitansi.deleteMany();
      await tx.pembayaran.deleteMany();
      await tx.invoiceItem.deleteMany();
      await tx.invoice.deleteMany();
      await tx.layanan.deleteMany();
      await tx.pelanggan.deleteMany();
      await tx.setting.deleteMany();
      await tx.pengguna.deleteMany();

      if (dataSetting) {
        await tx.setting.create({ data: dataSetting });
      }
      if (dataPengguna.length) {
        await tx.pengguna.createMany({ data: dataPengguna });
      }
      if (dataPelanggan.length) {
        await tx.pelanggan.createMany({ data: dataPelanggan });
      }
      if (dataLayanan.length) {
        await tx.layanan.createMany({ data: dataLayanan });
      }
      for (const inv of dataInvoice) {
        await tx.invoice.create({
          data: { ...inv.utama, items: { create: inv.items } },
        });
      }
      if (dataPembayaran.length) {
        await tx.pembayaran.createMany({ data: dataPembayaran });
      }
      if (dataKwitansi.length) {
        await tx.kwitansi.createMany({ data: dataKwitansi });
      }

      return {
        pelanggan: dataPelanggan.length,
        layanan: dataLayanan.length,
        invoice: dataInvoice.length,
        pembayaran: dataPembayaran.length,
        kwitansi: dataKwitansi.length,
        pengguna: dataPengguna.length,
      };
    });
    return NextResponse.json({ ok: true, ringkasan: hasil });
  } catch {
    return NextResponse.json(
      { error: "Gagal memulihkan cadangan — data tidak diubah." },
      { status: 400 }
    );
  }
}
