import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESI = "dfk_session";

const kunci = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dfk-billing-rahasia-lokal"
);

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
    .sign(kunci);
}

export async function verifikasiToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, kunci);
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
