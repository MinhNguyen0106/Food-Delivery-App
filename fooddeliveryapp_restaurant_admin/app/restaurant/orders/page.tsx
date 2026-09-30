"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderCard } from "@/components/restaurant/OrderCard";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/order";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setOrders(await orderService.list()); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải đơn hàng"); } finally { setLoading(false); } }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function update(order: Order, status: OrderStatus) {
    try {
      const result =
        status === "CONFIRMED"
          ? await orderService.confirmOrder(order.orderId)
          : status === "PREPARING"
            ? await orderService.prepareOrder(order.orderId)
            : status === "READY_FOR_PICKUP"
              ? await orderService.markReadyForPickup(order.orderId)
              : null;
      if (!result) {
        throw new Error(`Không hỗ trợ chuyển đơn sang trạng thái ${status}`);
      }
      setOrders((current) =>
        current.map((item) =>
          item.orderId === order.orderId
            ? { ...item, status: result.status }
            : item,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật đơn");
    }
  }
  async function reject(order: Order, note: string) {
    try {
      const result = await orderService.rejectOrder(order.orderId, note);
      setOrders((current) =>
        current.map((item) =>
          item.orderId === order.orderId
            ? { ...item, status: result.status }
            : item,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể từ chối đơn");
    }
  }
  return <section><div className="mb-8 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-orange-500">Vận hành</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Đơn hàng</h1></div><button onClick={() => void load()} className="rounded-lg border bg-white px-3 py-2 text-sm font-medium">Làm mới</button></div>{error && <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{loading ? <p className="text-sm text-slate-500">Đang tải đơn hàng...</p> : orders.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">Chưa có đơn hàng.</div> : <div className="grid gap-4 lg:grid-cols-2">{orders.map((order) => <OrderCard key={order.orderId} order={order} onStatusChange={(status) => update(order, status)} onReject={(note) => reject(order, note)} />)}</div>}</section>;
}
