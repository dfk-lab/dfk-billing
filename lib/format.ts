export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatRpPendek(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} rb`;
  return String(n);
}

export const NAMA_BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export function formatWaktu(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export function sisaHari(isoAkhir: string) {
  const sekarang = new Date();
  const utcHariIni = Date.UTC(
    sekarang.getUTCFullYear(),
    sekarang.getUTCMonth(),
    sekarang.getUTCDate()
  );
  const akhir = new Date(isoAkhir);
  const utcAkhir = Date.UTC(
    akhir.getUTCFullYear(),
    akhir.getUTCMonth(),
    akhir.getUTCDate()
  );
  return Math.round((utcAkhir - utcHariIni) / 86400000);
}

export const LABEL_PERIODE: Record<string, string> = {
  BULANAN: "Bulanan",
  TAHUNAN: "Tahunan",
  SEKALI: "Sekali bayar",
};

export const LABEL_METODE: Record<string, string> = {
  TUNAI: "Tunai",
  TRANSFER: "Transfer bank",
  QRIS: "QRIS",
  LAINNYA: "Lainnya",
};

export const LABEL_STATUS_LAYANAN: Record<string, string> = {
  AKTIF: "Aktif",
  BERAKHIR: "Berakhir",
};

export type ItemInput = { deskripsi: string; qty: number; hargaSatuan: number };

export function hitungTotal(
  items: ItemInput[],
  diskonPersen: number,
  ppnPersen: number
) {
  const subtotal = Math.round(
    items.reduce((acc, it) => acc + it.qty * it.hargaSatuan, 0)
  );
  const diskon = Math.round((subtotal * diskonPersen) / 100);
  const dasar = subtotal - diskon;
  const ppn = Math.round((dasar * ppnPersen) / 100);
  return { subtotal, diskon, ppn, total: dasar + ppn };
}
