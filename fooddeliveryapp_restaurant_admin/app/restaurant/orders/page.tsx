"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OrderCard } from "@/components/restaurant/OrderCard";
import { ListPagination } from "@/components/shared/ListPagination";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/order";

type OrderFilter = OrderStatus | "ACTIVE" | "ALL";

const statusFilters: { label: string; value: OrderFilter }[] = [
  { label: "Đang xử lý", value: "ACTIVE" },
  { label: "Mọi trạng thái", value: "ALL" },
  { label: "Chờ xác nhận", value: "PENDING" },
  { label: "Đã xác nhận", value: "CONFIRMED" },
  { label: "Đang chuẩn bị", value: "PREPARING" },
  { label: "Chờ shipper lấy", value: "READY_FOR_PICKUP" },
  { label: "Đang giao", value: "DELIVERING" },
];

const ORDERS_PER_PAGE = 10;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderFilter>("ACTIVE");
  const [pageState, setPageState] = useState({ filter: "ACTIVE" as OrderFilter, page: 1 });
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await orderService.list());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const visibleOrders = orders.filter((order) =>
    statusFilter === "ALL"
      ? true
      : statusFilter === "ACTIVE"
        ? !["COMPLETED", "CANCELLED", "REJECTED"].includes(order.status)
        : order.status === statusFilter,
  );
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(
    pageState.filter === statusFilter ? pageState.page : 1,
    pageCount,
  );
  const pageOrders = visibleOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE,
  );

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-600">Vận hành</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Đơn hàng</h1>
          <p className="mt-2 text-sm text-slate-600">Tiếp nhận đơn và cập nhật trạng thái chuẩn bị món.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/restaurant/history" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium">Lịch sử đơn</Link>
          <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium disabled:opacity-50">Làm mới</button>
        </div>
      </div>
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Lọc trạng thái đơn hàng">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={statusFilter === filter.value}
            onClick={() => {
              setStatusFilter(filter.value);
              setPageState({ filter: filter.value, page: 1 });
            }}
            className={`rounded-full px-3 py-2 text-sm font-medium ${statusFilter === filter.value ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-slate-500" role="status">Đang tải đơn hàng...</p>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {orders.length === 0 ? "Chưa có đơn hàng." : "Không có đơn phù hợp với trạng thái đã chọn."}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pageOrders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              onStatusChange={(status) => update(order, status)}
              onReject={(note) => reject(order, note)}
            />
          ))}
          <ListPagination
            page={currentPage}
            pageSize={ORDERS_PER_PAGE}
            total={visibleOrders.length}
            onPageChange={(page) => setPageState({ filter: statusFilter, page })}
          />
        </div>
      )}
    </section>
  );
}
