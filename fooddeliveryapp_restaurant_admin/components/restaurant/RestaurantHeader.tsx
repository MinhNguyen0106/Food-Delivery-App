"use client";

import { useRouter } from "next/navigation";

export function RestaurantHeader() {
  const router = useRouter();
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">
      <div>
        <p className="text-sm text-slate-500">Khu vực quản lý</p>
        <h1 className="font-semibold text-slate-900">Restaurant Portal</h1>
      </div>
      <button
        type="button"
        onClick={() => router.push("/auth/login")}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Đăng xuất
      </button>
    </header>
  );
}
