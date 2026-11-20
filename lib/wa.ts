import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal, hitungTotal } from "@/lib/format";

export function normalisasiNomor(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("0")) {
    return "62" + d.slice(1);
  }
  if (d.startsWith("62") && d.length >= 10) {
    return d;
  }
  if (d.length >= 8) {
    return d;
  }
  return null;
}

type HasilWa = { ok: boolean; pesan: string };

export async function kirimWa(
  nomor: string,
  pesan: string,
  opsi: {
    aktif?: boolean;
    url?: string | null;
    user?: string | null;
    pass?: string | null;
  } = {}
): Promise<HasilWa> {
  const setting = await prisma.setting.findFirst();
  const aktif = opsi.aktif ?? setting?.waAktif ?? false;
  if (!aktif) {
    return { ok: false, pesan: "Notifikasi WhatsApp tidak aktif." };
  }
  const target = normalisasiNomor(nomor);
  if (!target) {
    return { ok: false, pesan: `Nomor tidak valid: ${nomor}` };
  }
  const dasar = (
    opsi.url ||
    setting?.waApiUrl ||
    "https://wa.dfk.my.id"
  ).replace(/\/+$/, "");

  const user = opsi.user !== undefined ? opsi.user : setting?.waApiUser ?? null;
  const pass =
    opsi.pass !== undefined ? opsi.pass : setting?.waApiPassword ?? null;

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (user || pass) {
    headers.Authorization =
      "Basic " + Buffer.from(`${user ?? ""}:${pass ?? ""}`).toString("base64");
  }

  let res: Response;
  try {
    res = await fetch(`${dasar}/send/message`, {
      method: "POST",
      headers,
      body: new URLSearchParams({ phone: target, message: pesan }).toString(),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return {
      ok: false,
      pesan: `Gagal terhubung ke gateway: ${e instanceof Error ? e.message : e}`,
    };
  }

  const teks = await res.text();
  if (!res.ok) {
    return { ok: false, pesan: `Gateway HTTP ${res.status}: ${teks.slice(0, 140)}` };
  }
  try {
    const j = JSON.parse(teks) as { code?: number | string; message?: string };
    // Sebagian versi GoWA membalas sukses dengan code non-"200" (mis. "OK"/number)
    // tapi message "Message sent to ...". Terima keduanya.
    const sukses = String(j.code) === "200" || /message sent|success/i.test(j.message ?? "");
    if (sukses) {
      return { ok: true, pesan: j.message || "Terkirim" };
    }
    return { ok: false, pesan: j.message || teks.slice(0, 140) };
  } catch {
    return { ok: true, pesan: "Terkirim" };
  }
}

export async function kirimWaAman(
  nomor: string | null | undefined,
  pesan: string
): Promise<HasilWa | null> {
  if (!nomor || !nomor.trim()) return null;
  try {
    const hasil = await kirimWa(nomor, pesan);
    if (!hasil.ok) console.warn(`[wa] ${hasil.pesan}`);
    return hasil;
  } catch (e) {
    console.warn("[wa]", e);
    return null;
  }
}

async function namaUsaha(): Promise<string> {
  const s = await prisma.setting.findFirst();
  return s?.namaUsaha?.trim() || "DFK Billing";
}

export async function waInvoiceBaru(invoiceId: number): Promise<HasilWa | null> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      pelanggan: { select: { nama: true, telepon: true } },
      items: true,
    },
  });
  if (!inv || inv.status === "DRAFT" || !inv.pelanggan.telepon) return null;

  const total = hitungTotal(
    inv.items.map((it) => ({
      deskripsi: it.deskripsi,
      qty: it.qty,
      hargaSatuan: it.hargaSatuan,
    })),
    inv.diskonPersen,
    inv.ppnPersen
  ).total;

  const usaha = await namaUsaha();
  const barisJatuhTempo = inv.jatuhTempo
    ? `Jatuh tempo: ${formatTanggal(inv.jatuhTempo.toISOString())}\n`
    : "";

  const pesan =
    `*${usaha}*\n\n` +
    `Halo *${inv.pelanggan.nama}*, invoice baru telah diterbitkan.\n\n` +
    `No. Invoice: ${inv.nomor}\n` +
    `Total: ${formatRupiah(total)}\n` +
    barisJatuhTempo +
    `\nTerima kasih atas kepercayaan Anda.`;

  return kirimWaAman(inv.pelanggan.telepon, pesan);
}

export async function waPembayaranDiterima(
  pembayaranId: number
): Promise<HasilWa | null> {
  const bayar = await prisma.pembayaran.findUnique({
    where: { id: pembayaranId },
    include: {
      kwitansi: { select: { nomor: true } },
      invoice: {
        select: { nomor: true, pelanggan: { select: { nama: true, telepon: true } } },
      },
    },
  });
  if (!bayar || !bayar.invoice.pelanggan.telepon) return null;

  const usaha = await namaUsaha();
  const pesan =
    `*${usaha}*\n\n` +
    `Halo *${bayar.invoice.pelanggan.nama}*, pembayaran Anda telah kami terima.\n\n` +
    `No. Invoice: ${bayar.invoice.nomor}\n` +
    `Jumlah: ${formatRupiah(bayar.jumlah)}\n` +
    (bayar.kwitansi ? `No. Kwitansi: ${bayar.kwitansi.nomor}\n` : "") +
    `\nTerima kasih.`;

  return kirimWaAman(bayar.invoice.pelanggan.telepon, pesan);
}
