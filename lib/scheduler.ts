import { jalankanTugasHarian } from "@/lib/otomatis";

const INTERVAL_MENIT = 15;

export function mulaiScheduler() {
  const g = globalThis as Record<string, unknown>;
  if (g.__dfkSchedulerAktif) return;
  g.__dfkSchedulerAktif = true;

  async function detak() {
    try {
      const catatan = await jalankanTugasHarian();
      for (const c of catatan) console.log(`[scheduler] ${c}`);
    } catch (e) {
      console.error("[scheduler] Gagal:", e);
    }
  }

  console.log(`[scheduler] Aktif — pemeriksaan tiap ${INTERVAL_MENIT} menit.`);
  setTimeout(detak, 5000);
  setInterval(detak, INTERVAL_MENIT * 60 * 1000);
}
