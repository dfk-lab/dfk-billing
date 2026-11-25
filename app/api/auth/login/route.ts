import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buatSesi, cocokPassword } from "@/lib/auth";

const MAKS_GAGAL = 5;
const BLOKIR_MS = 15 * 60 * 1000;

// In-memory: cukup untuk satu container (bukan multi-instance).
const percobaan = new Map<string, { gagal: number; blokirSampai: number }>();

function kunciPercobaan(request: Request, nama: string) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "lokal";
  return `${ip}|${nama.toLowerCase()}`;
}

function entriBersih(kini: number) {
  for (const [k, v] of percobaan) {
    if (v.blokirSampai !== 0 && v.blokirSampai < kini) percobaan.delete(k);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { nama?: unknown; password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  if (!password) {
    return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
  }

  const kini = Date.now();
  entriBersih(kini);
  const kunci = kunciPercobaan(request, nama || "");
  const rekam = percobaan.get(kunci);
  if (rekam && rekam.blokirSampai > kini) {
    const menit = Math.ceil((rekam.blokirSampai - kini) / 60000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan gagal — coba lagi dalam ${menit} menit.` },
      { status: 429 }
    );
  }

  const aktif = await prisma.pengguna.findMany({ where: { aktif: true } });
  const pengguna = nama
    ? aktif.find((u) => u.nama.toLowerCase() === nama.toLowerCase())
    : aktif.length === 1
      ? aktif[0]
      : undefined;
  const gagalTotal = () => {
    const e = percobaan.get(kunci);
    if (!e || e.gagal === 0) percobaan.set(kunci, { gagal: 1, blokirSampai: 0 });
    else e.gagal += 1;
    const e2 = percobaan.get(kunci)!;
    if (e2.gagal >= MAKS_GAGAL) {
      e2.blokirSampai = Date.now() + BLOKIR_MS;
    }
  };
  const sukses = () => percobaan.delete(kunci);

  if (!pengguna) {
    if (nama) gagalTotal();
    return NextResponse.json(
      {
        error: nama
          ? "Pengguna tidak ditemukan atau nonaktif."
          : "Ada lebih dari satu pengguna. Isi kolom nama pengguna.",
      },
      { status: nama ? 401 : 400 }
    );
  }
  if (!cocokPassword(password, pengguna.passwordHash)) {
    gagalTotal();
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }
  sukses();
  await buatSesi(pengguna);
  return NextResponse.json({ ok: true });
}
