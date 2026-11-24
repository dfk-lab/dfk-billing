import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const EKSTENSI: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const JENIS = ["logo", "ttd", "qris"];

export const UKURAN_MAKS = 2 * 1024 * 1024;

// Ketentuan nama berkas: <jenis>-<YYYYMMDD>-<kode unik 8 hex>.<ekstensi>
const POLA_NAMA = /^(logo|ttd|qris)-(\d{8})-([0-9a-f]{8})\.(png|jpg|webp)$/;

export function dirUpload(): string {
  return process.env.UPLOAD_DIR || "./upload";
}

export function tipeMimeDariNama(nama: string): string {
  return nama.endsWith(".png")
    ? "image/png"
    : nama.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
}

export function simpanBerkas(
  buffer: Buffer,
  tipeMime: string,
  jenis: string
): string | null {
  if (!JENIS.includes(jenis)) return null;
  const ext = EKSTENSI[tipeMime];
  if (!ext) return null;
  const kini = new Date();
  const tgl =
    String(kini.getFullYear()) +
    String(kini.getMonth() + 1).padStart(2, "0") +
    String(kini.getDate()).padStart(2, "0");
  const nama = `${jenis}-${tgl}-${randomBytes(4).toString("hex")}.${ext}`;
  mkdirSync(dirUpload(), { recursive: true });
  writeFileSync(path.join(dirUpload(), nama), buffer);
  return nama;
}

export function bacaBerkas(nama: string): Buffer | null {
  if (!POLA_NAMA.test(nama)) return null;
  try {
    return readFileSync(path.join(dirUpload(), nama));
  } catch {
    return null;
  }
}

export function keArrayBuffer(buffer: Buffer): ArrayBuffer {
  const out = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(out).set(buffer);
  return out;
}

export function hapusBerkasUrl(url: string | null | undefined): void {
  if (!url?.startsWith("/api/berkas/")) return;
  const nama = url.slice("/api/berkas/".length);
  if (!POLA_NAMA.test(nama)) return;
  try {
    unlinkSync(path.join(dirUpload(), nama));
  } catch {
    // berkas memang sudah tidak ada
  }
}
