"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authService } from "@/services/auth.service";

export default function AdminLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const result = await authService.login(
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
      );
      if (result.user.role !== "ADMIN") {
        window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("token");
        setError("Tài khoản này không có quyền quản trị Admin.");
        return;
      }
      router.replace("/admin/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Đăng nhập thất bại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f1] px-5 py-10 text-[#1c3027]">
      <div className="mx-auto grid min-h-[min(720px,calc(100vh-5rem))] max-w-5xl overflow-hidden rounded-lg border border-[#dfe6df] bg-white shadow-[0_24px_70px_rgba(25,53,38,0.10)] md:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#173f31] p-8 text-white md:p-12">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-36 -left-28 h-96 w-96 rounded-full border border-white/10" />
          <Link href="/admin/login" className="relative text-sm font-bold tracking-[0.18em] text-white">
            FOODFLOW <span className="font-normal text-[#edaa73]">/ ADMIN</span>
          </Link>
          <div className="relative py-12">
            <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-[#d9ad83]">OPERATIONS PORTAL</p>
            <h1 className="max-w-sm text-4xl font-semibold leading-tight">Quản trị vận hành, rõ ràng từng ngày.</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">Không gian điều hành dành cho đội ngũ quản trị nền tảng FoodFlow.</p>
          </div>
          <p className="relative text-xs text-white/55">FoodFlow Management System</p>
        </section>

        <section className="flex items-center px-7 py-10 md:px-12">
          <div className="mx-auto w-full max-w-sm">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#9a6a40]">KHU VỰC QUẢN TRỊ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Đăng nhập Admin</h2>
            <p className="mt-2 text-sm text-[#718078]">Dùng tài khoản quản trị được cấp bởi hệ thống.</p>
            <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium" htmlFor="admin-email">
                Email
                <input id="admin-email" name="email" type="email" required autoComplete="username" className="mt-2 block h-11 w-full rounded border border-[#d9e1da] bg-white px-3 text-sm outline-none transition focus:border-[#39775a] focus:ring-2 focus:ring-[#39775a]/15" placeholder="admin@example.com" />
              </label>
              <label className="block text-sm font-medium" htmlFor="admin-password">
                Mật khẩu
                <input id="admin-password" name="password" type="password" required autoComplete="current-password" className="mt-2 block h-11 w-full rounded border border-[#d9e1da] bg-white px-3 text-sm outline-none transition focus:border-[#39775a] focus:ring-2 focus:ring-[#39775a]/15" placeholder="Nhập mật khẩu" />
              </label>
              {error && <p className="rounded border border-[#e8c6ba] bg-[#fff5f1] px-3 py-2 text-sm text-[#a3432a]" role="alert">{error}</p>}
              <button disabled={busy} className="flex h-11 w-full items-center justify-center rounded bg-[#1b533d] px-4 text-sm font-semibold text-white transition hover:bg-[#133e2e] disabled:cursor-wait disabled:opacity-60">
                {busy ? "Đang xác thực..." : "Đăng nhập"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}