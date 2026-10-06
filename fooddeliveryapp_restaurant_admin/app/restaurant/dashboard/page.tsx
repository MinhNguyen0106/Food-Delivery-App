"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { orderService } from "@/services/order.service";
import { reportService } from "@/services/report.service";
import type { Order } from "@/types/order";

type GroupBy = "day" | "week" | "month";

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function DashboardPage() {
  const [today, setToday] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenue, setRevenue] = useState<{ period: string; revenue: number | string; completed_orders: number }[]>([]);
  const [todayRevenue, setTodayRevenue] = useState<number | string>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = new Date();
      setToday(localDateString(current));
      setTo(localDateString(current));
      current.setDate(current.getDate() - 6);
      setFrom(localDateString(current));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadDashboard = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const [orderList, revenueRows, todayRows] = await Promise.all([
        orderService.list(),
        reportService.getRestaurantRevenue({ from, to, groupBy }),
        reportService.getRestaurantRevenue({ from: today, to: today, groupBy: "day" }),
      ]);
      if (requestId.current !== currentRequest) return;
      setOrders(orderList);
      setRevenue(revenueRows);
      setTodayRevenue(todayRows.find((row) => row.period === today)?.revenue ?? 0);
    } catch (cause) {
      if (requestId.current === currentRequest) {
        setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu.");
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [from, to, groupBy, today]);

  useEffect(() => {
    if (!today || !from || !to) return;
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => {
      requestId.current += 1;
      window.clearTimeout(timer);
    };
  }, [loadDashboard, today, from, to]);

  const metrics = useMemo(() => {
    const rangeOrders = orders.filter((order) => {
      const date = order.createdAt.slice(0, 10);
      return date >= from && date <= to;
    });
    return [
      ["Doanh thu hôm nay", formatMoney(todayRevenue)],
      ["Đơn trong kỳ", new Intl.NumberFormat("vi-VN").format(rangeOrders.length)],
      ["Đơn chờ xác nhận", new Intl.NumberFormat("vi-VN").format(rangeOrders.filter((order) => order.status === "PENDING").length)],
      ["Đơn hoàn thành trong kỳ", new Intl.NumberFormat("vi-VN").format(revenue.reduce((total, row) => total + row.completed_orders, 0))],
    ];
  }, [orders, from, to, revenue, todayRevenue]);
  const maxRevenue = Math.max(1, ...revenue.map((row) => Number(row.revenue)));
  const invalidRange = from > to;

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-orange-600">Tổng quan</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Hoạt động nhà hàng</h1>
          <p className="mt-2 text-sm text-slate-600">Theo dõi đơn hàng và doanh thu của cửa hàng.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Làm mới</button>
          <Link href="/restaurant/orders" className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Mở đơn hàng</Link>
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">Không thể tải dữ liệu: {error}</p>
      )}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-semibold text-slate-600">Từ ngày
          <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Đến ngày
          <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Gom nhóm
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupBy)} className="mt-1 block h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">
            <option value="day">Theo ngày</option>
            <option value="week">Theo tuần</option>
            <option value="month">Theo tháng</option>
          </select>
        </label>
      </div>
      {invalidRange && <p className="mb-4 text-sm text-red-700">Ngày bắt đầu không được sau ngày kết thúc.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{loading ? "—" : value}</p>
          </article>
        ))}
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Doanh thu theo thời gian</h2>
            <p className="mt-1 text-sm text-slate-500">Chỉ tính các đơn đã hoàn thành.</p>
          </div>
          {loading && <span role="status" className="text-sm text-slate-500">Đang tải...</span>}
        </div>
        {!loading && revenue.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Chưa có dữ liệu doanh thu trong khoảng thời gian này.</p>
        ) : (
          <div className="space-y-3">
            {revenue.map((row) => {
              const amount = Number(row.revenue);
              const width = `${Math.max(amount > 0 ? 3 : 0, (amount / maxRevenue) * 100)}%`;
              return (
                <div key={row.period} className="grid grid-cols-[90px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="text-slate-600">{row.period}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Doanh thu ${row.period}: ${formatMoney(amount)}`}>
                    <div className="h-full rounded-full bg-orange-500" style={{ width }} />
                  </div>
                  <span className="min-w-28 text-right font-semibold text-slate-800">{formatMoney(amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
