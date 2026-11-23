import { NextResponse } from "next/server";
import { bacaBerkas, keArrayBuffer, tipeMimeDariNama } from "@/lib/upload";

type Konteks = { params: Promise<{ nama: string }> };

export async function GET(_request: Request, { params }: Konteks) {
  const { nama } = await params;
  const isi = bacaBerkas(nama);
  if (!isi) {
    return new NextResponse("Berkas tidak ditemukan.", { status: 404 });
  }
  return new NextResponse(keArrayBuffer(isi), {
    headers: {
      "Content-Type": tipeMimeDariNama(nama),
      // nama berkas memuat kode unik dan tak pernah terpakai ulang
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
