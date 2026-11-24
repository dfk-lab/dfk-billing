import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { hitungTotal, LABEL_METODE } from "@/lib/format";

const GAYA_JUDUL = {
  font: { bold: true, size: 11, color: { argb: "FF1E293B" } },
  fill: {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFE2E8F0" },
  },
};

function lebarKolom(sheet: ExcelJS.Worksheet, lebar: number[]) {
  sheet.columns.forEach((kolom, i) => {
    kolom.width = lebar[i] ?? 16;
  });
}

function barisJudul(sheet: ExcelJS.Worksheet, judul: string[]) {
  const baris = sheet.addRow(judul);
  baris.eachCell((sel) => {
    sel.font = GAYA_JUDUL.font;
    sel.fill = GAYA_JUDUL.fill;
    sel.border = {
      bottom: { style: "thin", color: { argb: "FF94A3B8" } },
    };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function aturTanggal(sheet: ExcelJS.Worksheet, kolom: number, fmt = "dd/mm/yyyy") {
  sheet.getColumn(kolom).numFmt = fmt;
}

function aturRupiah(sheet: ExcelJS.Worksheet, kolom: number) {
  sheet.getColumn(kolom).numFmt = "#,##0";
}

export async function GET() {
  const [invoices, pembayaran, pelanggan] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        pelanggan: { select: { nama: true } },
        layanan: { select: { nama: true } },
        items: true,
        pembayaran: { select: { jumlah: true } },
      },
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    }),
    prisma.pembayaran.findMany({
      include: {
        invoice: { select: { nomor: true, pelanggan: { select: { nama: true } } } },
        kwitansi: { select: { nomor: true } },
      },
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    }),
    prisma.pelanggan.findMany({
      include: {
        invoices: {
          include: { items: true, pembayaran: { select: { jumlah: true } } },
        },
      },
      orderBy: { nama: "asc" },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "DFK Billing";
  wb.created = new Date();

  // Sheet Invoice
  const shInv = wb.addWorksheet("Invoice");
  barisJudul(shInv, [
    "Nomor",
    "Tanggal",
    "Pelanggan",
    "Layanan",
    "Jatuh tempo",
    "Status",
    "Subtotal (Rp)",
    "Diskon (Rp)",
    "PPN (Rp)",
    "Total (Rp)",
    "Dibayar (Rp)",
    "Sisa (Rp)",
  ]);
  lebarKolom(shInv, [18, 12, 22, 18, 12, 10, 13, 12, 12, 13, 13, 13]);
  aturTanggal(shInv, 2);
  aturTanggal(shInv, 5);
  for (const kolom of [7, 8, 9, 10, 11, 12]) aturRupiah(shInv, kolom);
  for (const inv of invoices) {
    const { subtotal, diskon, ppn, total } = hitungTotal(
      inv.items,
      inv.diskonPersen,
      inv.ppnPersen
    );
    const dibayar = inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);
    shInv.addRow([
      inv.nomor,
      inv.tanggal,
      inv.pelanggan.nama,
      inv.layanan?.nama ?? "",
      inv.jatuhTempo,
      inv.status,
      subtotal,
      diskon,
      ppn,
      total,
      dibayar,
      total - dibayar,
    ]);
  }

  // Sheet Pembayaran
  const shBayar = wb.addWorksheet("Pembayaran");
  barisJudul(shBayar, [
    "Tanggal",
    "Invoice",
    "Pelanggan",
    "Jumlah (Rp)",
    "Metode",
    "Kwitansi",
    "Catatan",
  ]);
  lebarKolom(shBayar, [12, 18, 22, 14, 16, 18, 30]);
  aturTanggal(shBayar, 1);
  aturRupiah(shBayar, 4);
  for (const p of pembayaran) {
    shBayar.addRow([
      p.tanggal,
      p.invoice.nomor,
      p.invoice.pelanggan.nama,
      p.jumlah,
      p.metode ? LABEL_METODE[p.metode] ?? p.metode : "",
      p.kwitansi?.nomor ?? "",
      p.catatan ?? "",
    ]);
  }

  // Sheet Pelanggan
  const shPel = wb.addWorksheet("Pelanggan");
  barisJudul(shPel, [
    "Nama",
    "Perusahaan",
    "Telepon",
    "Email",
    "Alamat",
    "Jumlah invoice",
    "Total tagihan (Rp)",
    "Total dibayar (Rp)",
    "Sisa (Rp)",
  ]);
  lebarKolom(shPel, [22, 20, 15, 24, 30, 13, 16, 16, 14]);
  aturRupiah(shPel, 7);
  aturRupiah(shPel, 8);
  aturRupiah(shPel, 9);
  for (const pl of pelanggan) {
    let jumlahInv = 0;
    let totalTagihan = 0;
    let totalDibayar = 0;
    for (const inv of pl.invoices) {
      if (inv.status === "DRAFT") continue;
      jumlahInv += 1;
      const { total } = hitungTotal(
        inv.items,
        inv.diskonPersen,
        inv.ppnPersen
      );
      totalTagihan += total;
      totalDibayar += inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);
    }
    shPel.addRow([
      pl.nama,
      pl.perusahaan ?? "",
      pl.telepon ?? "",
      pl.email ?? "",
      pl.alamat ?? "",
      jumlahInv,
      totalTagihan,
      totalDibayar,
      totalTagihan - totalDibayar,
    ]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const kini = new Date();
  const tgl = `${kini.getFullYear()}${String(kini.getMonth() + 1).padStart(2, "0")}${String(kini.getDate()).padStart(2, "0")}`;
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dfk-billing-${tgl}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
