"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { authService } from "@/services/auth.service";

const navigation = [
  { href: "/admin/dashboard", label: "Tổng quan", mark: "OV" },
  { href: "/admin/categories", label: "Danh mục", mark: "DM" },
  { href: "/admin/customers", label: "Khách hàng", mark: "KH" },
  { href: "/admin/restaurants", label: "Nhà hàng", mark: "NH" },
  { href: "/admin/shippers", label: "Shipper", mark: "SH" },
  { href: "/admin/orders", label: "Đơn hàng", mark: "DH" },
  { href: "/admin/reviews", label: "Đánh giá", mark: "DG" },
  { href: "/admin/vouchers", label: "Voucher", mark: "VC" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("Administrator");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem("accessToken")) {
      router.replace("/admin/login");
      return;
    }
    let mounted = true;
    authService.getProfile().then((profile) => {
      if (!mounted) return;
      if (profile.role !== "ADMIN") {
        void authService.logout();
        router.replace("/admin/login");
        return;
      }
      setName(profile.admin?.fullName || profile.email || "Administrator");
      setReady(true);
    }).catch(() => {
      window.localStorage.removeItem("accessToken");
      router.replace("/admin/login");
    });
    return () => { mounted = false; };
  }, [router]);

  async function logout() {
    try { await authService.logout(); }
    finally { router.replace("/admin/login"); }
  }

  return (
    <div className="min-h-screen bg-[#f3f5f1] text-[#1c3027]">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e1e7e1] bg-white px-5 md:px-8">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded bg-[#194a37] text-xs font-bold tracking-wide text-[#f3bc8d]">FF</span>
          <span className="text-sm font-semibold tracking-wide">FOODFLOW <span className="font-normal text-[#89938d]">/ MANAGEMENT</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#68776e] sm:inline">{name}</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e5eee6] text-xs font-semibold text-[#275d42]">{name.slice(0, 1).toUpperCase()}</span>
        </div>
      </header>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px]">
        <aside className="fixed bottom-0 top-16 z-10 flex w-[78px] flex-col border-r border-[#e1e7e1] bg-white px-2 py-4 md:sticky md:w-60 md:px-3">
          <p className="hidden px-3 pb-3 pt-2 text-[10px] font-semibold tracking-[0.16em] text-[#9ba69e] md:block">QUẢN LÝ HỆ THỐNG</p>
          <nav className="flex flex-1 flex-col gap-1" aria-label="Điều hướng Admin">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={active ? "page" : undefined} className={`flex h-11 items-center justify-center gap-3 rounded text-sm transition md:justify-start md:px-3 ${active ? "bg-[#eaf1eb] font-semibold text-[#20573d]" : "text-[#65736b] hover:bg-[#f4f6f3] hover:text-[#263c30]"}`}>
                <span className={`text-[10px] font-semibold ${active ? "text-[#34724e]" : "text-[#a5aea8]"}`}>{item.mark}</span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>;
            })}
          </nav>
          <button type="button" onClick={logout} className="flex h-11 items-center justify-center gap-3 rounded px-3 text-sm font-medium text-[#9a4a3b] hover:bg-[#fbf1ee] md:justify-start">
            <span aria-hidden="true">↪</span><span className="hidden md:inline">Đăng xuất</span>
          </button>
        </aside>
        <main className="min-w-0 flex-1 pl-[78px] md:pl-0">
          {ready ? children : <div className="p-8 text-sm text-[#77847b]">Đang xác thực phiên quản trị...</div>}
        </main>
      </div>
    </div>
  );
}