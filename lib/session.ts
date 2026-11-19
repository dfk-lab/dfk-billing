import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESI = "dfk_session";

const kunci = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dfk-billing-rahasia-lokal"
);

export async function tandatanganToken(penggunaId: number) {
  return new SignJWT({ uid: penggunaId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(kunci);
}

export async function verifikasiToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, kunci);
    return typeof payload.uid === "number" ? { penggunaId: payload.uid } : null;
  } catch {
    return null;
  }
}
