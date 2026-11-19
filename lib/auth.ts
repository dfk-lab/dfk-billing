import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { COOKIE_SESI, tandatanganToken, verifikasiToken } from "@/lib/session";

export async function buatSesi(penggunaId: number) {
  const token = await tandatanganToken(penggunaId);
  (await cookies()).set(COOKIE_SESI, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function hapusSesi() {
  (await cookies()).delete(COOKIE_SESI);
}

export async function ambilSesi() {
  const token = (await cookies()).get(COOKIE_SESI)?.value;
  if (!token) return null;
  return verifikasiToken(token);
}

export function hashPassword(plain: string) {
  return bcrypt.hashSync(plain, 10);
}

export function cocokPassword(plain: string, hash: string) {
  return bcrypt.compareSync(plain, hash);
}
