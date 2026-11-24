export const DEFAULT_TEMPLATE_TAGIHAN = `*{namaUsaha}*

Halo *{nama}*, berikut tagihan Anda.

No. Invoice: {nomor}
Jatuh tempo: {jatuhTempo}{ketTempo}
Total: {total}
Sisa: {sisa}

Mohon segera lakukan pembayaran. Terima kasih.`;

export const DEFAULT_TEMPLATE_KWITANSI = `*{namaUsaha}*

Halo *{nama}*, pembayaran Anda telah kami terima.

No. Kwitansi: {nomorKwitansi}
No. Invoice: {nomorInvoice}
Jumlah: {jumlah}
Tanggal: {tanggal}

Terima kasih atas kepercayaan Anda.`;

export const VAR_TAGIHAN = [
  "namaUsaha",
  "nama",
  "nomor",
  "total",
  "sisa",
  "jatuhTempo",
  "ketTempo",
  "linkBayar",
  "linkTagihan",
] as const;

export const VAR_KWITANSI = [
  "namaUsaha",
  "nama",
  "nomorKwitansi",
  "nomorInvoice",
  "jumlah",
  "metode",
  "tanggal",
] as const;

export function isiTemplate(
  teks: string,
  variabel: Record<string, string | null | undefined>
): string {
  return teks.replace(/\{([a-zA-Z]+)\}/g, (asli, kunci: string) => {
    if (!(kunci in variabel)) return asli;
    return variabel[kunci] ?? "";
  });
}

export const CONTOH_VAR_TAGIHAN: Record<string, string> = {
  namaUsaha: "DFK Billing",
  nama: "Budi Santoso",
  nomor: "INV-20261119-001",
  total: "Rp500.000",
  sisa: "Rp500.000",
  jatuhTempo: "26 Nov 2026",
  ketTempo: " (3 hari lagi)",
  linkBayar: "https://sandbox.midtrans.com/pay/abc123",
  linkTagihan: "http://192.168.1.10:4000/tagihan/abc123…",
};

export const CONTOH_VAR_KWITANSI: Record<string, string> = {
  namaUsaha: "DFK Billing",
  nama: "Budi Santoso",
  nomorKwitansi: "KWT-20261119-001",
  nomorInvoice: "INV-20261119-001",
  jumlah: "Rp500.000",
  metode: "Transfer bank",
  tanggal: "19 Nov 2026",
};
