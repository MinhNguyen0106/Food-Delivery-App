"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ApiClientError } from "@/services/api.client";
import { authService } from "@/services/auth.service";
import type { ActorProfile } from "@/types/service-api";

const links = [
  { href: "/restaurant/dashboard", label: "Tổng quan", mark: "▦" },
  { href: "/restaurant/orders", label: "Đơn hàng", mark: "▤" },
  { href: "/restaurant/history", label: "Lịch sử", mark: "◷" },
  { href: "/restaurant/menu", label: "Thực đơn", mark: "◈" },
  { href: "/restaurant/profile", label: "Hồ sơ", mark: "○" },
];

export function RestaurantPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<ActorProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const checkSession = useCallback(async () => {
    setChecking(true);
    setError("");
    if (!window.localStorage.getItem("accessToken") &&
      !window.localStorage.getItem("token")) {
      router.replace("/");
      return;
    }
    try {
      const current = await authService.getProfile();
      if (current.role !== "RESTAURANT" || !current.restaurant?.restaurantId) {
        window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("token");
        router.replace("/");
        return;
      }
      setProfile(current);
      setChecking(false);
    } catch (cause) {
      if (
        cause instanceof ApiClientError &&
        (cause.status === 401 || cause.status === 403)
      ) {
        window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("token");
        router.replace("/");
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể xác minh phiên nhà hàng.",
      );
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void checkSession(), 0);
    return () => window.clearTimeout(timer);
  }, [checkSession]);

  async function logout() {
    try {
      await authService.logout();
      router.replace("/");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Đã xóa phiên đăng nhập trên thiết bị nhưng không thể xác nhận đăng xuất với máy chủ: ${cause.message}`
          : "Không thể xác nhận đăng xuất với máy chủ.",
      );
      setProfile(null);
      setChecking(false);
    }
  }

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-sm text-slate-600">
        Đang xác minh phiên nhà hàng...
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="mx-auto grid min-h-screen max-w-xl place-content-center gap-4 bg-slate-50 p-6 text-slate-700">
        <h1 className="text-xl font-semibold">Không thể mở khu vực nhà hàng</h1>
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => void checkSession()} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Thử lại</button>
          <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Đăng nhập</Link>
        </div>
      </main>
    );
  }

  if (!profile) return null;
  const restaurantName = profile.restaurant?.name || profile.email;

  return (
    <div className="restaurant-portal min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-slate-200 bg-white p-5 md:block">
        <Link href="/restaurant/dashboard" className="mb-8 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-slate-800 text-xs font-bold tracking-wide text-white">FD</span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">Food Delivery</span>
            <span className="block text-[11px] text-slate-500">QUẢN LÝ NHÀ HÀNG</span>
          </span>
        </Link>
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Không gian làm việc</p>
        <nav aria-label="Điều hướng nhà hàng" className="space-y-0.5">
          {links.map((link) => {
            const active = pathname === link.href ||
              (link.href === "/restaurant/orders" && pathname.startsWith("/restaurant/orders/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-[13px] font-medium ${active ? "border-slate-700 bg-slate-100 text-slate-900" : "border-transparent text-slate-600 hover:bg-slate-50"}`}
              >
                <span aria-hidden="true" className="w-5 text-center">{link.mark}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-h-screen md:pl-60">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Nhà hàng</p>
            <p className="truncate text-sm font-semibold text-slate-800">{restaurantName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/restaurant/profile" className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:inline-flex">Hồ sơ cửa hàng</Link>
            <button type="button" onClick={() => void logout()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Đăng xuất</button>
          </div>
        </header>
        {error && (
          <p role="alert" className="mx-4 mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 md:mx-8">{error}</p>
        )}
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1600px] px-4 py-6 pb-24 md:px-8 md:py-7 md:pb-8">
          {children}
        </main>
      </div>

      <nav aria-label="Điều hướng nhà hàng trên điện thoại" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.04)] md:hidden">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${active ? "text-slate-900" : "text-slate-500"}`}
            >
              <span aria-hidden="true" className="text-base">{link.mark}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
