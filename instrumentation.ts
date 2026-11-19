export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { mulaiScheduler } = await import("./lib/scheduler");
  mulaiScheduler();
}
