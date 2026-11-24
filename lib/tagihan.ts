import { randomBytes } from "node:crypto";

// Kode tagihan: token acak 32 hex untuk tautan cek tagihan publik /tagihan/<kode>
export function kodeTagihanBaru(): string {
  return randomBytes(16).toString("hex");
}

export function urlTagihan(baseUrl: string, kode: string): string {
  const dasar = baseUrl.trim().replace(/\/+$/, "");
  if (!dasar) return "";
  return `${dasar}/tagihan/${kode}`;
}
