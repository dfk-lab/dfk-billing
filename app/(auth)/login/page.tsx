import { prisma } from "@/lib/prisma";
import LogoUsaha from "@/components/LogoUsaha";
import LoginForm from "./LoginForm";
import SetupForm from "./SetupForm";

export const instant = false;

export default async function LoginPage() {
  const jumlahPengguna = await prisma.pengguna.count();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="kaca muncul w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <LogoUsaha size={48} className="mx-auto mb-3 drop-shadow-[0_0_22px_rgba(34,211,238,0.6)]" />
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">DFK Billing</h1>
          <p className="mt-1 text-sm text-slate-400">Invoice &amp; Kwitansi Tagihan</p>
        </div>
        {jumlahPengguna === 0 ? <SetupForm /> : <LoginForm />}
      </div>
    </div>
  );
}
