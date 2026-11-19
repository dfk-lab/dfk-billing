import { prisma } from "@/lib/prisma";
import type { ItemInput } from "@/lib/format";

export type { ItemInput };

const STATUS = ["DRAFT", "TERKIRIM"];

function parseTanggal(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dataInvoice(body: Record<string, unknown>) {
  const error: string[] = [];
  const pelangganId = Number(body.pelangganId);
  if (!Number.isInteger(pelangganId)) error.push("Pelanggan wajib dipilih.");

  const layananId =
    body.layananId !== undefined && body.layananId !== null && body.layananId !== ""
      ? Number(body.layananId)
      : null;
  if (layananId !== null && !Number.isInteger(layananId)) {
    error.push("Layanan tidak valid.");
  }

  const tanggal =
    typeof body.tanggal === "string" ? parseTanggal(body.tanggal) : null;
  if (!tanggal) error.push("Tanggal invoice tidak valid.");

  const jatuhTempo =
    typeof body.jatuhTempo === "string" && body.jatuhTempo !== ""
      ? parseTanggal(body.jatuhTempo)
      : null;
  if (body.jatuhTempo && !jatuhTempo) error.push("Jatuh tempo tidak valid.");

  const status =
    typeof body.status === "string" && STATUS.includes(body.status)
      ? body.status
      : "DRAFT";

  const diskonPersen = Number(body.diskonPersen ?? 0);
  if (Number.isNaN(diskonPersen) || diskonPersen < 0 || diskonPersen > 100) {
    error.push("Diskon harus 0–100 persen.");
  }
  const ppnPersen = Number(body.ppnPersen ?? 0);
  if (Number.isNaN(ppnPersen) || ppnPersen < 0 || ppnPersen > 100) {
    error.push("PPN harus 0–100 persen.");
  }

  const catatan =
    typeof body.catatan === "string" && body.catatan.trim() !== ""
      ? body.catatan.trim()
      : null;

  const items: ItemInput[] = [];
  if (!Array.isArray(body.items)) {
    error.push("Invoice minimal punya satu item.");
  } else {
    body.items.forEach((raw, i) => {
      const it = raw as Record<string, unknown>;
      const deskripsi =
        typeof it.deskripsi === "string" ? it.deskripsi.trim() : "";
      const qty = Number(it.qty);
      const hargaSatuan = Number(it.hargaSatuan);
      if (!deskripsi) error.push(`Item ${i + 1}: deskripsi wajib diisi.`);
      if (!Number.isFinite(qty) || qty <= 0)
        error.push(`Item ${i + 1}: jumlah harus lebih dari 0.`);
      if (!Number.isInteger(hargaSatuan) || hargaSatuan < 0)
        error.push(`Item ${i + 1}: harga satuan tidak valid.`);
      items.push({
        deskripsi,
        qty: Number.isFinite(qty) ? qty : 0,
        hargaSatuan: Number.isInteger(hargaSatuan) ? hargaSatuan : 0,
      });
    });
    if (items.length === 0) error.push("Invoice minimal punya satu item.");
  }

  return {
    error,
    data: {
      pelangganId,
      layananId,
      tanggal: tanggal as Date,
      jatuhTempo,
      status,
      diskonPersen,
      ppnPersen,
      catatan,
      items,
    },
  };
}

export async function nomorInvoiceBerikutnya() {
  const setting =
    (await prisma.setting.findFirst()) ?? (await prisma.setting.create({ data: {} }));
  const prefix = setting.prefixInvoice.trim() || "INV";
  const kini = new Date();
  const ym = `${kini.getUTCFullYear()}${String(kini.getUTCMonth() + 1).padStart(2, "0")}`;
  const awalan = `${prefix}/${ym}/`;
  const terakhir = await prisma.invoice.findFirst({
    where: { nomor: { startsWith: awalan } },
    orderBy: { nomor: "desc" },
  });
  let urut = 1;
  if (terakhir) {
    const n = Number(terakhir.nomor.slice(awalan.length));
    if (Number.isFinite(n)) urut = n + 1;
  }
  return `${awalan}${String(urut).padStart(4, "0")}`;
}
