"use client";

import { useEffect, useState } from "react";
import { restaurantService } from "@/services/restaurant.service";
import type { RestaurantDashboard } from "@/types/restaurant";

export default function DashboardPage() {
  const [data, setData] = useState<RestaurantDashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { restaurantService.getDashboard().then(setData).catch((e: Error) => setError(e.message)); }, []);
  const cards = data ? [["Doanh thu hôm nay", `${data.todayRevenue.toLocaleString("vi-VN")}đ`], ["Đơn hôm nay", data.todayOrderCount], ["Đơn chờ xử lý", data.pendingOrderCount], ["Đơn hoàn thành", data.completedOrderCount]] : [];
  return <section><div className="mb-8"><p className="text-sm font-medium text-orange-500">Tổng quan</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Chào mừng trở lại</h1></div>{error && <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">Không thể tải dữ liệu: {error}</div>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p></div>)}</div>{!data && !error && <p className="mt-8 text-sm text-slate-500">Đang tải thống kê...</p>}</section>;
}
