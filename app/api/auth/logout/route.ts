import { NextResponse } from "next/server";
import { hapusSesi } from "@/lib/auth";

export async function POST() {
  await hapusSesi();
  return NextResponse.json({ ok: true });
}
