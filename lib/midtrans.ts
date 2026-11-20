import { prisma } from "@/lib/prisma";
import { hitungTotal, formatRupiah } from "@/lib/format";
import { nomorKwitansiBerikutnya } from "@/lib/pembayaran";
import { waPembayaranDiterima } from "@/lib/wa";

const LABEL_STATUS: Record<string, string> = {
  pending: "menunggu pembayaran",
  settlement: "berhasil (settled)",
  capture: "berhasil (captured)",
  deny: "ditolak",
  cancel: "dibatalkan",
  expire: "kedaluwarsa",
  refund: "dikembalikan",
  partially_refunded: "sebagian dikembalikan",
  failure: "gagal",
};

function baseUrlMidtrans(mode: string, override: string): string {
  if (override.trim()) return override.trim().replace(/\/+$/, "");
  return mode === "produksi"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

// Midtrans order_id hanya boleh huruf, angka, dash, underscore, titik, dan tilde.
// Nomor invoice memakai "/" (mis. INV/202611/0001) — diganti "-" plus penanda unik.
function orderIdInvoice(nomor: string): string {
  const dasar = nomor.replace(/[^a-zA-Z0-9_.~-]/g, "-").slice(0, 40);
  return `${dasar}-${Date.now().toString(36)}`;
}

function pesanKesalahan(status: number, teks: string): string {
  if (status === 401) return "Server key Midtrans salah.";
  let detail = "";
  try {
    const j = JSON.parse(teks) as { error_messages?: string[] };
    if (j.error_messages?.length) detail = `: ${j.error_messages.join(" ")}`;
  } catch {
    if (teks) detail = `: ${teks.slice(0, 140)}`;
  }
  return `Midtrans HTTP ${status}${detail}`;
}

function sisaTagihan(inv: {
  items: { deskripsi: string; qty: number; hargaSatuan: number }[];
  diskonPersen: number;
  ppnPersen: number;
  pembayaran: { jumlah: number }[];
}): number {
  const { total } = hitungTotal(inv.items, inv.diskonPersen, inv.ppnPersen);
  const dibayar = inv.pembayaran.reduce((a, p) => a + p.jumlah, 0);
  return Math.max(total - dibayar, 0);
}

export async function buatPaymentLink(
  invoiceId: number
): Promise<{ ok: boolean; pesan: string; url?: string }> {
  const setting = await prisma.setting.findFirst();
  if (!setting?.midtransAktif) {
    return { ok: false, pesan: "Midtrans belum diaktifkan di Pengaturan." };
  }
  if (!setting.midtransServerKey.trim()) {
    return { ok: false, pesan: "Server key Midtrans belum diisi di Pengaturan." };
  }

  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      pelanggan: { select: { nama: true } },
      items: true,
      pembayaran: { select: { jumlah: true } },
    },
  });
  if (!inv) return { ok: false, pesan: "Invoice tidak ditemukan." };
  if (inv.status === "DRAFT") {
    return { ok: false, pesan: "Invoice masih draft — terbitkan dulu." };
  }
  const sisa = sisaTagihan(inv);
  if (sisa <= 0) return { ok: false, pesan: "Invoice sudah lunas." };

  const orderId = orderIdInvoice(inv.nomor);
  const dasar = baseUrlMidtrans(setting.midtransMode, setting.midtransApiUrl);

  let res: Response;
  try {
    res = await fetch(`${dasar}/v1/payment-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization:
          "Basic " +
          Buffer.from(`${setting.midtransServerKey.trim()}:`).toString("base64"),
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: sisa },
        item_details: [
          {
            id: inv.nomor.replace(/[^a-zA-Z0-9_.~-]/g, "-").slice(0, 40),
            name: `Invoice ${inv.pelanggan.nama}`.slice(0, 50),
            price: sisa,
            quantity: 1,
          },
        ],
        customer_required: false,
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return {
      ok: false,
      pesan: `Gagal terhubung ke Midtrans: ${
        e instanceof Error ? e.message : e
      }`,
    };
  }

  const teks = await res.text();
  if (!res.ok) return { ok: false, pesan: pesanKesalahan(res.status, teks) };

  let j: { payment_link_id?: string; payment_url?: string };
  try {
    j = JSON.parse(teks);
  } catch {
    return { ok: false, pesan: "Respons Midtrans tidak valid." };
  }
  if (!j.payment_url) {
    return { ok: false, pesan: "Midtrans tidak mengirim URL pembayaran." };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentLinkId: j.payment_link_id ?? null,
      paymentLinkUrl: j.payment_url,
      paymentLinkOrderId: orderId,
    },
  });
  return {
    ok: true,
    pesan: "Link pembayaran dibuat.",
    url: j.payment_url,
  };
}

export async function cekStatusPembayaran(
  invoiceId: number
): Promise<{ ok: boolean; pesan: string; lunas?: boolean }> {
  const setting = await prisma.setting.findFirst();
  if (!setting?.midtransAktif) {
    return { ok: false, pesan: "Midtrans belum diaktifkan di Pengaturan." };
  }
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, pembayaran: { select: { jumlah: true } } },
  });
  if (!inv) return { ok: false, pesan: "Invoice tidak ditemukan." };
  if (!inv.paymentLinkOrderId) {
    return { ok: false, pesan: "Belum ada link pembayaran untuk invoice ini." };
  }

  const dasar = baseUrlMidtrans(setting.midtransMode, setting.midtransApiUrl);
  let res: Response;
  try {
    res = await fetch(
      `${dasar}/v2/${inv.paymentLinkOrderId}/status`,
      {
        headers: {
          Accept: "application/json",
          Authorization:
            "Basic " +
            Buffer.from(`${setting.midtransServerKey.trim()}:`).toString(
              "base64"
            ),
        },
        signal: AbortSignal.timeout(20000),
      }
    );
  } catch (e) {
    return {
      ok: false,
      pesan: `Gagal terhubung ke Midtrans: ${
        e instanceof Error ? e.message : e
      }`,
    };
  }

  const teks = await res.text();
  if (!res.ok) return { ok: false, pesan: pesanKesalahan(res.status, teks) };

  let j: { transaction_status?: string; payment_type?: string };
  try {
    j = JSON.parse(teks);
  } catch {
    return { ok: false, pesan: "Respons Midtrans tidak valid." };
  }
  const st = j.transaction_status ?? "";
  const label = LABEL_STATUS[st] ?? st;

  if (st === "settlement" || st === "capture") {
    const sisa = sisaTagihan(inv);
    if (sisa <= 0) {
      return { ok: true, pesan: "Invoice sudah lunas.", lunas: true };
    }
    const nomor = await nomorKwitansiBerikutnya();
    const metode =
      j.payment_type === "qris" || j.payment_type === "gopay" ? "QRIS" : "TRANSFER";
    const pembayaran = await prisma.pembayaran.create({
      data: {
        invoiceId,
        jumlah: sisa,
        metode,
        catatan: `Midtrans (${j.payment_type ?? "-"})`,
        kwitansi: {
          create: { nomor, penerima: setting.namaPemilik?.trim() || null },
        },
      },
      include: { kwitansi: true },
    });
    void waPembayaranDiterima(pembayaran.id).catch(() => {});
    return {
      ok: true,
      pesan: `Pembayaran ${formatRupiah(sisa)} diterima via Midtrans — invoice lunas (kwitansi ${pembayaran.kwitansi?.nomor}).`,
      lunas: true,
    };
  }

  return {
    ok: true,
    pesan: `Pembayaran belum masuk — status: ${label || "tidak diketahui"}.`,
  };
}
