import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  await connection();
  const setting = await prisma.setting.findFirst();
  const m = setting?.logo?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (m) {
    return new NextResponse(Buffer.from(m[2], "base64"), {
      headers: {
        "Content-Type": m[1],
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.redirect(new URL("/logo-dfk.svg", request.url));
}
