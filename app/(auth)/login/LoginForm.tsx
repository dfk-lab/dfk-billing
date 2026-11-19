"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputCls = "masukan mt-1 w-full text-sm";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [memproses, setMemproses] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMemproses(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Gagal masuk.");
      setMemproses(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={memproses}
        className="tombol-utama w-full"
      >
        {memproses ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
