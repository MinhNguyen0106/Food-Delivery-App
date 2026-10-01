"use client";

import { useEffect, useState } from "react";
import { orderService } from "@/services/order.service";
import { reportService } from "@/services/report.service";
import type { Order } from "@/types/order";

interface RestaurantDashboard {
  todayRevenue: number;
  todayOrderCount: number;
  pendingOrderCount: number;
  completedOrderCount: number;
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<RestaurantDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = localDateString(new Date());
      Promise.all([
        orderService.list(),
        reportService.getRestaurantRevenue({
          from: today,
          to: today,
          groupBy: "day",
        }),
      ])
        .then(([orders, revenue]) => {
          const todayRevenue = revenue.find((row) => row.period === today);
          setData({
            todayRevenue: Number(todayRevenue?.revenue ?? 0),
            todayOrderCount: orders.filter(
              (order: Order) => order.createdAt.slice(0, 10) === today,
            ).length,
            pendingOrderCount: orders.filter(
              (order: Order) => order.status === "PENDING",
            ).length,
            completedOrderCount: revenue.reduce(
              (total, row) => total + row.completed_orders,
              0,
            ),
          });
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error ? reason.message : "Không thể tải dữ liệu",
          );
        });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const cards = data
    ? [
        [
          "Doanh thu hôm nay",
          `${data.todayRevenue.toLocaleString("vi-VN")}đ`,
        ],
        ["Đơn hôm nay", data.todayOrderCount],
        ["Đơn chờ xử lý", data.pendingOrderCount],
        ["Đơn hoàn thành", data.completedOrderCount],
      ]
    : [];

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-orange-500">Tổng quan</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Chào mừng trở lại
        </h1>
      </div>
      {error && (
        <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Không thể tải dữ liệu: {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      {!data && !error && (
        <p className="mt-8 text-sm text-slate-500">
          Đang tải thống kê...
        </p>
      )}
    </section>
  );
}
