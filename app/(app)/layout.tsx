import AppShell from "@/components/AppShell";
import { ambilSesi } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesi = await ambilSesi();
  return (
    <AppShell role={sesi?.role ?? "ADMIN"} namaPengguna={sesi?.nama || null}>
      {children}
    </AppShell>
  );
}
