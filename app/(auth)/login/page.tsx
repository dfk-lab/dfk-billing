import { prisma } from "@/lib/prisma";
import LoginForm from "./LoginForm";
import SetupForm from "./SetupForm";

export const instant = false;

export default async function LoginPage() {
  const jumlahPengguna = await prisma.pengguna.count();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            D
          </div>
          <h1 className="text-xl font-semibold tracking-tight">DFK Billing</h1>
          <p className="mt-1 text-sm text-zinc-500">Invoice &amp; Kwitansi Tagihan</p>
        </div>
        {jumlahPengguna === 0 ? <SetupForm /> : <LoginForm />}
      </div>
    </div>
  );
}
