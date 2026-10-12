"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { orderService } from "@/services/order.service";
import { reportService } from "@/services/report.service";
import type { Order } from "@/types/order";

type GroupBy = "day" | "week" | "month";
type CurrentPeriod = "today" | "week" | "month";

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentPeriodRange(groupBy: GroupBy, current = new Date()) {
  const start = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const end = new Date(start);

  if (groupBy === "week") {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    end.setDate(start.getDate() + 6);
  } else if (groupBy === "month") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  }

  return { from: localDateString(start), to: localDateString(end) };
}

function getCurrentPeriod(groupBy: GroupBy): CurrentPeriod {
  return groupBy === "day" ? "today" : groupBy;
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
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenue, setRevenue] = useState<{ period: string; revenue: number | string; completed_orders: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = new Date();
      const currentDate = localDateString(current);
      setToday(currentDate);
      setFrom(currentDate);
      setTo(currentDate);
      setReportFrom(currentDate);
      setReportTo(currentDate);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadDashboard = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const [orderList, revenueRows] = await Promise.all([
        orderService.list(),
        reportService.getRestaurantRevenue({
          from: reportFrom,
          to: reportTo,
          groupBy,
        }),
      ]);
      if (requestId.current !== currentRequest) return;
      setOrders(orderList);
      setRevenue(revenueRows);
    } catch (cause) {
      if (requestId.current === currentRequest) {
        setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu.");
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [reportFrom, reportTo, groupBy]);

  useEffect(() => {
    if (!today || !reportFrom || !reportTo) return;
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => {
      requestId.current += 1;
      window.clearTimeout(timer);
    };
  }, [loadDashboard, today, reportFrom, reportTo]);

  const metrics = useMemo(() => {
    const rangeOrders = orders.filter((order) => {
      const date = order.createdAt.slice(0, 10);
      return date >= reportFrom && date <= reportTo;
    });
    const rangeRevenue = revenue.reduce(
      (total, row) => total + Number(row.revenue),
      0,
    );
    const revenueLabel = reportFrom === today && reportTo === today
      ? "Doanh thu hôm nay"
      : reportFrom === reportTo
        ? "Doanh thu ngày đã chọn"
        : "Doanh thu trong kỳ";
    return [
      [revenueLabel, formatMoney(rangeRevenue)],
      ["Đơn trong kỳ", new Intl.NumberFormat("vi-VN").format(rangeOrders.length)],
      ["Đơn chờ xác nhận", new Intl.NumberFormat("vi-VN").format(rangeOrders.filter((order) => order.status === "PENDING").length)],
      ["Đơn hoàn thành trong kỳ", new Intl.NumberFormat("vi-VN").format(revenue.reduce((total, row) => total + row.completed_orders, 0))],
    ];
  }, [orders, reportFrom, reportTo, revenue, today]);
  const maxRevenue = Math.max(1, ...revenue.map((row) => Number(row.revenue)));
  const invalidRange = from > to;

  function showCurrentPeriod(period: CurrentPeriod) {
    const range = currentPeriodRange(period === "today" ? "day" : period);
    setGroupBy(period === "today" ? "day" : period);
    setFrom(range.from);
    setTo(range.to);
    setReportFrom(range.from);
    setReportTo(range.to);
  }

  function applyDateRange() {
    if (!from || !to || from > to) return;
    setGroupBy("day");
    setReportFrom(from);
    setReportTo(to);
  }

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
      <div className="mb-5 grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Thống kê theo khoảng ngày</h2>
          <p className="mt-1 text-xs text-slate-500">
            Chọn ngày bắt đầu và kết thúc; kiểu gom nhóm chỉ thay đổi cách phân chia kết quả.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-slate-600">Từ ngày
              <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Đến ngày
              <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <button
              type="button"
              onClick={applyDateRange}
              disabled={!from || !to || from > to}
              className="h-10 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Thống kê
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Thống kê kỳ hiện tại</h2>
          <p className="mt-1 text-xs text-slate-500">
            Chọn nhanh hôm nay, tuần này hoặc tháng này; lịch bên trên vẫn dùng được để tùy chỉnh khoảng ngày.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              ["today", "Hôm nay"],
              ["week", "Tuần này"],
              ["month", "Tháng này"],
            ] as const).map(([period, label]) => {
              const range = currentPeriodRange(
                period === "today" ? "day" : period,
              );
              const selected = getCurrentPeriod(groupBy) === period &&
                range.from === reportFrom &&
                range.to === reportTo;
              return (
                <button
                  key={period}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => showCurrentPeriod(period as CurrentPeriod)}
                  className={`h-10 rounded-lg border px-4 text-sm font-semibold ${
                    selected
                      ? "border-emerald-800 bg-emerald-800 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
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
