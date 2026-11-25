import { authSecretValid } from "./lib/session";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (
    process.env.NODE_ENV === "production" &&
    !authSecretValid(process.env.AUTH_SECRET)
  ) {
    console.error(
      "[dfk] AUTH_SECRET belum diset atau masih nilai default — isi di .env (lihat README) lalu jalankan ulang."
    );
    process.exit(1);
  }
  const { mulaiScheduler } = await import("./lib/scheduler");
  mulaiScheduler();
}
