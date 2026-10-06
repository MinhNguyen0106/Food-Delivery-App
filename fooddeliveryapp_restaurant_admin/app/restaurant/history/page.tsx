"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ListPagination } from "@/components/shared/ListPagination";
import { orderService } from "@/services/order.service";
import type { Order } from "@/types/order";
import type { OrderHistoryRecord } from "@/types/service-api";

const finalStatuses = new Set(["COMPLETED", "CANCELLED", "REJECTED"]);
const HISTORY_ORDERS_PER_PAGE = 10;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export default function RestaurantHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<OrderHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      orderService.list().then((result) => {
        if (active) setOrders(result.filter((order) => finalStatuses.has(order.status)));
      }).catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải lịch sử đơn hàng.");
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const pageCount = Math.max(1, Math.ceil(orders.length / HISTORY_ORDERS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = orders.slice(
    (currentPage - 1) * HISTORY_ORDERS_PER_PAGE,
    currentPage * HISTORY_ORDERS_PER_PAGE,
  );

  async function toggleHistory(orderId: number) {
    if (selectedId === orderId) {
      setSelectedId(null);
      setHistory([]);
      return;
    }
    setSelectedId(orderId);
    setHistory([]);
    setLoadingHistory(true);
    setError("");
    try {
      setHistory(await orderService.getHistory(orderId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải diễn biến đơn hàng.");
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <section>
      <div className="mb-7">
        <p className="text-sm font-medium text-orange-600">Vận hành</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Lịch sử đơn hàng</h1>
        <p className="mt-2 text-sm text-slate-600">Các đơn đã hoàn thành, bị từ chối hoặc đã hủy.</p>
      </div>
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p role="status" className="text-sm text-slate-500">Đang tải lịch sử...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Chưa có đơn hàng trong lịch sử.</div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <article key={order.orderId} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{order.orderCode}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <span className="font-semibold text-slate-900">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-600">Trạng thái cuối: {order.status.replaceAll("_", " ")}</p>
                <button type="button" aria-expanded={selectedId === order.orderId} onClick={() => void toggleHistory(order.orderId)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {selectedId === order.orderId ? "Ẩn diễn biến" : "Xem diễn biến"}
                </button>
              </div>
              {selectedId === order.orderId && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-800">Các mốc trạng thái</h2>
                  {loadingHistory ? (
                    <p role="status" className="mt-3 text-sm text-slate-500">Đang tải...</p>
                  ) : history.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">Chưa có lịch sử trạng thái.</p>
                  ) : (
                    <ol className="mt-3 space-y-3">
                      {history.map((entry, index) => (
                        <li key={entry.history_id ?? `${entry.changed_at}-${index}`} className="flex gap-3 text-sm">
                          <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-orange-500" />
                          <div>
                            <p className="font-medium text-slate-800">{entry.status.replaceAll("_", " ")}</p>
                            <p className="text-xs text-slate-500">{formatDate(entry.changed_at)}</p>
                            {entry.note && <p className="mt-1 text-slate-600">{entry.note}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </article>
          ))}
          <ListPagination
            page={currentPage}
            pageSize={HISTORY_ORDERS_PER_PAGE}
            total={orders.length}
            onPageChange={(nextPage) => {
              setSelectedId(null);
              setHistory([]);
              setPage(nextPage);
            }}
          />
        </div>
      )}
    </section>
  );
}
