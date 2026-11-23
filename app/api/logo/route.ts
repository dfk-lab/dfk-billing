import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { bacaBerkas, keArrayBuffer, tipeMimeDariNama } from "@/lib/upload";

export async function GET(request: Request) {
  await connection();
  const setting = await prisma.setting.findFirst();
  const logo = setting?.logo;
  const namaBerkas = logo?.startsWith("/api/berkas/")
    ? logo.slice("/api/berkas/".length)
    : null;
  if (namaBerkas) {
    const isi = bacaBerkas(namaBerkas);
    if (isi) {
      return new NextResponse(keArrayBuffer(isi), {
        headers: {
          "Content-Type": tipeMimeDariNama(namaBerkas),
          "Cache-Control": "no-store",
        },
      });
    }
  }
  const m = logo?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (m) {
    return new NextResponse(keArrayBuffer(Buffer.from(m[2], "base64")), {
      headers: {
        "Content-Type": m[1],
        "Cache-Control": "no-store",
      },
    });
  }
  // Location relatif agar tetap benar di belakang reverse proxy (CasaOS/HTTPS)
  return new NextResponse(null, {
    status: 307,
    headers: { Location: "/logo-dfk.svg" },
  });
}
