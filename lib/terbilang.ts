const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

function toTeks(m: number): string {
  if (m === 0) return "";
  if (m < 12) return SATUAN[m];
  if (m < 20) return `${toTeks(m - 10)} belas`;
  if (m < 100)
    return `${toTeks(Math.floor(m / 10))} puluh ${SATUAN[m % 10]}`.trimEnd();
  if (m < 200) return `seratus ${toTeks(m - 100)}`.trimEnd();
  if (m < 1000)
    return `${toTeks(Math.floor(m / 100))} ratus ${toTeks(m % 100)}`.trimEnd();
  if (m < 2000) return `seribu ${toTeks(m - 1000)}`.trimEnd();
  if (m < 1e6)
    return `${toTeks(Math.floor(m / 1000))} ribu ${toTeks(m % 1000)}`.trimEnd();
  if (m < 1e9)
    return `${toTeks(Math.floor(m / 1e6))} juta ${toTeks(m % 1e6)}`.trimEnd();
  if (m < 1e12)
    return `${toTeks(Math.floor(m / 1e9))} miliar ${toTeks(m % 1e9)}`.trimEnd();
  return String(m);
}

export function terbilang(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "nol";
  return toTeks(Math.round(n)).replace(/\s+/g, " ").trim();
}

export function terbilangRupiah(n: number): string {
  return `${terbilang(n)} rupiah`;
}
