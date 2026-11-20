import { NextResponse } from "next/server";
import { buatPaymentLink } from "@/lib/midtrans";

type Konteks = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Konteks) {
  const invoiceId = Number((await params).id);
  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  const hasil = await buatPaymentLink(invoiceId);
  return NextResponse.json(hasil, { status: hasil.ok ? 200 : 400 });
}
