import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESI = "dfk_session";

// Nilai yang tidak boleh dipakai di produksi — berasal dari fallback lama
// di kode dan default docker-compose.yml yang terbaca publik di repo.
const NILAI_TERLARANG = new Set([
  "dfk-billing-rahasia-lokal",
  "SILAKAN-GANTI-KUNCI-INI-DENGAN-STRING-ACAK-PANJANG",
]);

export function authSecretValid(nilai: string | undefined): boolean {
  const k = nilai?.trim();
  return !!k && !NILAI_TERLARANG.has(k);
}

let kunciCache: Uint8Array | null = null;

function kunci(): Uint8Array {
  if (!kunciCache) {
    const nilai = process.env.AUTH_SECRET?.trim() ?? "";
    if (!authSecretValid(nilai)) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "AUTH_SECRET belum diset atau masih nilai default — isi di .env (lihat README) lalu jalankan ulang."
        );
      }
      // Hanya untuk pengembangan lokal tanpa .env
      kunciCache = new TextEncoder().encode(nilai || "dfk-billing-rahasia-lokal");
      return kunciCache;
    }
    kunciCache = new TextEncoder().encode(nilai);
  }
  return kunciCache;
}

export type Sesi = { penggunaId: number; nama: string; role: string };

export async function tandatanganToken(sesi: {
  id: number;
  nama: string;
  role: string;
}) {
  return new SignJWT({ uid: sesi.id, nama: sesi.nama, role: sesi.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(kunci());
}

export async function verifikasiToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, kunci());
    if (typeof payload.uid !== "number") return null;
    // Token lama (sebelum multi-pengguna) tidak punya role — dianggap ADMIN
    const role =
      typeof payload.role === "string" ? payload.role : "ADMIN";
    const nama = typeof payload.nama === "string" ? payload.nama : "";
    return { penggunaId: payload.uid, nama, role } satisfies Sesi;
  } catch {
    return null;
  }
}
