"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { reportService } from "@/services/report.service";
import type { AdminSummaryRecord } from "@/types/service-api";

const metrics: { key: keyof AdminSummaryRecord; label: string; detail: string; format?: "money" }[] = [
  { key: "total_orders", label: "Đơn hàng", detail: "Tổng đơn đã ghi nhận" },
  { key: "total_restaurant_revenue", label: "Doanh thu nhà hàng", detail: "Từ các đơn hoàn thành", format: "money" },
  { key: "total_restaurants", label: "Nhà hàng", detail: "Đối tác trên nền tảng" },
  { key: "total_shippers", label: "Shipper", detail: "Tài khoản giao hàng" },
  { key: "total_customers", label: "Khách hàng", detail: "Tài khoản khách hàng" },
];

function metricValue(value: number | string, money = false) {
  const amount = Number(value);
  return money ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount) : new Intl.NumberFormat("vi-VN").format(amount);
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummaryRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setSummary(await reportService.getAdminSummary()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải báo cáo."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    reportService.getAdminSummary().then((data) => {
      if (active) setSummary(data);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Không thể tải báo cáo.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-9">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe6df] pb-6">
      <div><p className="text-xs font-semibold tracking-[0.14em] text-[#a06a3d]">FOODFLOW / ADMIN</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Tổng quan vận hành</h1><p className="mt-2 text-sm text-[#77847b]">Số liệu tổng hợp từ hệ thống.</p></div>
      <button onClick={() => void load()} disabled={loading} className="h-10 rounded border border-[#d7e0d8] bg-white px-4 text-sm font-semibold text-[#345a43] hover:bg-[#f6f8f5] disabled:opacity-50">{loading ? "Đang tải..." : "↻ Làm mới"}</button>
    </div>
    {error && <p className="mt-6 rounded border border-[#e8c6ba] bg-[#fff5f1] px-4 py-3 text-sm text-[#a3432a]" role="alert">{error}</p>}
    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Chỉ số tổng quan">
      {metrics.map((metric, index) => <article key={metric.key} className="min-h-36 rounded border border-[#e0e7e0] bg-white p-5">
        <div className="flex items-center justify-between"><p className="text-sm font-medium text-[#66756b]">{metric.label}</p><span className="text-xs font-semibold text-[#b17c4b]">0{index + 1}</span></div>
        <p className="mt-5 text-2xl font-semibold tracking-tight">{loading ? "—" : summary ? metricValue(summary[metric.key] as number | string, metric.format === "money") : "—"}</p>
        <p className="mt-1 text-xs text-[#8a958e]">{metric.detail}</p>
      </article>)}
    </section>
    {summary && <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded border border-[#e0e7e0] bg-white p-5 md:p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Tình hình hôm nay</h2><p className="mt-1 text-xs text-[#87928b]">Theo trạng thái đơn hàng</p></div><Link href="/admin/orders" className="text-sm font-semibold text-[#39734e] hover:underline">Danh sách đơn →</Link></div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[ ["Hôm nay", summary.orders_today], ["Hoàn thành", summary.completed_orders], ["Đang chờ", summary.orders_by_status.PENDING ?? 0], ["Đã hủy", summary.cancelled_orders] ].map(([label, value]) => <div key={String(label)} className="border-l-2 border-[#d59a63] pl-3"><p className="text-xs text-[#7d8982]">{label}</p><p className="mt-1 text-xl font-semibold">{metricValue(value as number)}</p></div>)}
        </div>
      </div>
      <div className="rounded border border-[#e0e7e0] bg-[#1b4b37] p-5 text-white md:p-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#e8b987]">DOANH THU HÔM NAY</p>
        <p className="mt-4 text-3xl font-semibold">{metricValue(summary.revenue_today, true)}</p>
        <p className="mt-2 text-sm text-white/65">Doanh thu tính theo đơn hoàn thành.</p>
        <Link href="/admin/restaurants" className="mt-6 inline-flex text-sm font-semibold text-[#f0c79f] hover:underline">Quản lý đối tác →</Link>
      </div>
    </section>}
  </div>;
}