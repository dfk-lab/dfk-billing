import { prisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal, hitungTotal, LABEL_METODE } from "@/lib/format";
import { urlTagihan } from "@/lib/tagihan";
import {
  DEFAULT_TEMPLATE_KWITANSI,
  DEFAULT_TEMPLATE_TAGIHAN,
  isiTemplate,
} from "@/lib/wa-template";

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

export type MetaWa = {
  jenis: string;
  keterangan?: string | null;
  namaPelanggan?: string | null;
  nomorInvoice?: string | null;
  nomorKwitansi?: string | null;
};

export async function catatPesanWa(
  nomor: string,
  pesan: string,
  hasil: HasilWa | null,
  meta: MetaWa
) {
  try {
    await prisma.pesanWa.create({
      data: {
        jenis: meta.jenis,
        status: hasil?.ok ? "TERKIRIM" : "GAGAL",
        nomorTujuan: normalisasiNomor(nomor) || nomor,
        pesan,
        namaPelanggan: meta.namaPelanggan ?? null,
        nomorInvoice: meta.nomorInvoice ?? null,
        nomorKwitansi: meta.nomorKwitansi ?? null,
        keterangan:
          [meta.keterangan, hasil && !hasil.ok ? hasil.pesan : null]
            .filter(Boolean)
            .join(" · ") || null,
      },
    });
  } catch (e) {
    console.warn("[wa] gagal mencatat log pesan:", e);
  }
}

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
  pesan: string,
  meta: MetaWa = { jenis: "LAINNYA" }
): Promise<HasilWa | null> {
  if (!nomor || !nomor.trim()) return null;
  try {
    const hasil = await kirimWa(nomor, pesan);
    if (!hasil.ok) console.warn(`[wa] ${hasil.pesan}`);
    await catatPesanWa(nomor, pesan, hasil, meta);
    return hasil;
  } catch (e) {
    const pesanGagal = e instanceof Error ? e.message : String(e);
    console.warn("[wa]", e);
    await catatPesanWa(nomor, pesan, { ok: false, pesan: pesanGagal }, meta);
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

  return kirimWaAman(inv.pelanggan.telepon, pesan, {
    jenis: "INVOICE_BARU",
    namaPelanggan: inv.pelanggan.nama,
    nomorInvoice: inv.nomor,
  });
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

  return kirimWaAman(bayar.invoice.pelanggan.telepon, pesan, {
    jenis: "PEMBAYARAN",
    namaPelanggan: bayar.invoice.pelanggan.nama,
    nomorInvoice: bayar.invoice.nomor,
    nomorKwitansi: bayar.kwitansi?.nomor ?? null,
  });
}

async function ringkasanTagihan(invoiceId: number) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      pelanggan: { select: { nama: true, telepon: true } },
      items: true,
      pembayaran: { select: { jumlah: true } },
    },
  });
}

export async function waKirimTagihanKePelanggan(
  invoiceId: number,
  ketTempo = "",
  opsi: { jenis?: string; keterangan?: string } = {}
): Promise<HasilWa> {
  const inv = await ringkasanTagihan(invoiceId);
  if (!inv) return { ok: false, pesan: "Invoice tidak ditemukan." };
  if (inv.status === "DRAFT") {
    return { ok: false, pesan: "Invoice masih draft — terbitkan dulu." };
  }
  if (!inv.pelanggan.telepon) {
    return { ok: false, pesan: "Pelanggan tidak memiliki nomor WhatsApp." };
  }

  const { total } = hitungTotal(
    inv.items.map((it) => ({
      deskripsi: it.deskripsi,
      qty: it.qty,
      hargaSatuan: it.hargaSatuan,
    })),
    inv.diskonPersen,
    inv.ppnPersen
  );
  const dibayar = inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);
  const sisa = Math.max(total - dibayar, 0);

  const setting = await prisma.setting.findFirst();
  const teks = setting?.waTemplateTagihan?.trim() || DEFAULT_TEMPLATE_TAGIHAN;
  const pesan = isiTemplate(teks, {
    namaUsaha: setting?.namaUsaha?.trim() || "DFK Billing",
    nama: inv.pelanggan.nama,
    nomor: inv.nomor,
    total: formatRupiah(total),
    sisa: formatRupiah(sisa),
    jatuhTempo: inv.jatuhTempo
      ? formatTanggal(inv.jatuhTempo.toISOString())
      : "—",
    ketTempo,
    linkBayar: inv.paymentLinkUrl ?? "",
    linkTagihan: urlTagihan(setting?.urlPublik ?? "", inv.kodeTagihan),
  });

  const hasil = await kirimWaAman(inv.pelanggan.telepon, pesan, {
    jenis: opsi.jenis ?? "TAGIHAN",
    keterangan: opsi.keterangan ?? "Manual",
    namaPelanggan: inv.pelanggan.nama,
    nomorInvoice: inv.nomor,
  });
  return hasil ?? { ok: false, pesan: "Gagal mengirim WhatsApp." };
}

export async function waKirimKwitansiKePelanggan(
  kwitansiId: number
): Promise<HasilWa> {
  const k = await prisma.kwitansi.findUnique({
    where: { id: kwitansiId },
    include: {
      pembayaran: {
        include: {
          invoice: {
            include: { pelanggan: { select: { nama: true, telepon: true } } },
          },
        },
      },
    },
  });
  if (!k) return { ok: false, pesan: "Kwitansi tidak ditemukan." };
  if (!k.pembayaran.invoice.pelanggan.telepon) {
    return { ok: false, pesan: "Pelanggan tidak memiliki nomor WhatsApp." };
  }

  const setting = await prisma.setting.findFirst();
  const teks = setting?.waTemplateKwitansi?.trim() || DEFAULT_TEMPLATE_KWITANSI;
  const pesan = isiTemplate(teks, {
    namaUsaha: setting?.namaUsaha?.trim() || "DFK Billing",
    nama: k.pembayaran.invoice.pelanggan.nama,
    nomorKwitansi: k.nomor,
    nomorInvoice: k.pembayaran.invoice.nomor,
    jumlah: formatRupiah(k.pembayaran.jumlah),
    metode: k.pembayaran.metode
      ? LABEL_METODE[k.pembayaran.metode] ?? k.pembayaran.metode
      : "—",
    tanggal: formatTanggal(k.pembayaran.tanggal.toISOString()),
  });

  const hasil = await kirimWaAman(
    k.pembayaran.invoice.pelanggan.telepon,
    pesan,
    {
      jenis: "KWITANSI",
      keterangan: "Manual",
      namaPelanggan: k.pembayaran.invoice.pelanggan.nama,
      nomorInvoice: k.pembayaran.invoice.nomor,
      nomorKwitansi: k.nomor,
    }
  );
  return hasil ?? { ok: false, pesan: "Gagal mengirim WhatsApp." };
}
