import { NextResponse } from "next/server";
import { connection } from "next/server";
import { UKURAN_MAKS, simpanBerkas } from "@/lib/upload";

export async function POST(request: Request) {
  await connection();
  const form = await request.formData();
  const berkas = form.get("berkas");
  const jenis = form.get("jenis");
  if (!(berkas instanceof File)) {
    return NextResponse.json(
      { error: "Berkas tidak ditemukan." },
      { status: 400 }
    );
  }
  if (jenis !== "logo" && jenis !== "ttd") {
    return NextResponse.json(
      { error: "Jenis unggahan tidak dikenal." },
      { status: 400 }
    );
  }
  if (berkas.size > UKURAN_MAKS) {
    return NextResponse.json(
      { error: "Ukuran berkas maksimal 2 MB." },
      { status: 400 }
    );
  }
  const nama = simpanBerkas(
    Buffer.from(await berkas.arrayBuffer()),
    berkas.type,
    jenis
  );
  if (!nama) {
    return NextResponse.json(
      { error: "Tipe berkas harus PNG, JPG, atau WEBP." },
      { status: 400 }
    );
  }
  return NextResponse.json({ nama });
}
