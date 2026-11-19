import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { ambilSesi } from "@/lib/auth";
import { folderCadangan, validasiNamaCadangan } from "@/lib/otomatis";

type Params = { params: Promise<{ nama: string }> };

export async function GET(_request: Request, { params }: Params) {
  const sesi = await ambilSesi();
  if (!sesi) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  const { nama } = await params;
  if (!validasiNamaCadangan(nama)) {
    return NextResponse.json({ error: "Nama file tidak valid." }, { status: 400 });
  }
  const berkas = path.join(folderCadangan(), nama);
  const isi = await fs.readFile(berkas, "utf8").catch(() => null);
  if (isi === null) {
    return NextResponse.json({ error: "File cadangan tidak ditemukan." }, { status: 404 });
  }
  return new NextResponse(isi, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${nama}"`,
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const sesi = await ambilSesi();
  if (!sesi) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  const { nama } = await params;
  if (!validasiNamaCadangan(nama)) {
    return NextResponse.json({ error: "Nama file tidak valid." }, { status: 400 });
  }
  await fs.rm(path.join(folderCadangan(), nama), { force: true });
  return NextResponse.json({ ok: true });
}
