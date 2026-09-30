"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/restaurant/dashboard", label: "Tổng quan", icon: "▦" },
  { href: "/restaurant/orders", label: "Đơn hàng", icon: "▤" },
  { href: "/restaurant/menu", label: "Thực đơn", icon: "◈" },
];

export function RestaurantSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 md:block">
      <div className="mb-10 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-orange-500 font-bold text-white">FD</div>
        <div>
          <p className="font-bold text-slate-900">Food Delivery</p>
          <p className="text-xs text-slate-500">Restaurant Portal</p>
        </div>
      </div>
      <nav className="space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${active ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
