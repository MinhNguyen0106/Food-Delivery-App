"use client";

import { useState } from "react";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/order";
import { StatusBadge } from "@/components/shared/StatusBadge";

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY_FOR_PICKUP",
};

const actionLabel: Partial<Record<OrderStatus, string>> = {
  PENDING: "Xác nhận đơn",
  CONFIRMED: "Bắt đầu chuẩn bị",
  PREPARING: "Sẵn sàng lấy món",
};

export function OrderCard({
  order,
  onStatusChange,
  onReject,
}: {
  order: Order;
  onStatusChange: (status: OrderStatus) => Promise<void>;
  onReject: (note: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [details, setDetails] = useState<Order | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const next = nextStatus[order.status];

  async function toggleDetails() {
    if (showDetails) {
      setShowDetails(false);
      return;
    }
    setShowDetails(true);
    if (details) return;
    setLoadingDetails(true);
    setDetailError("");
    try {
      setDetails(await orderService.getById(order.orderId));
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : "Không thể tải món trong đơn.");
    } finally {
      setLoadingDetails(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">{order.orderCode}</p>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(order.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="my-4 space-y-2 border-y border-slate-100 py-4">
        <button type="button" aria-expanded={showDetails} onClick={() => void toggleDetails()} className="text-sm font-semibold text-emerald-800 hover:underline">
          {showDetails ? "Ẩn món trong đơn" : "Xem món trong đơn"}
        </button>
        {showDetails && (
          <div className="space-y-2 pt-1">
            {loadingDetails && <p role="status" className="text-sm text-slate-500">Đang tải chi tiết đơn...</p>}
            {detailError && <p role="alert" className="text-sm text-red-700">{detailError}</p>}
            {details?.details.map((detail) => (
              <div key={detail.orderDetailId} className="flex justify-between gap-3 text-sm">
                <span className="text-slate-600">{detail.quantity} × {detail.food?.name ?? `Món #${detail.foodId}`}</span>
                <span className="shrink-0 font-medium text-slate-800">{detail.subtotal.toLocaleString("vi-VN")}đ</span>
              </div>
            ))}
            {details && details.details.length === 0 && <p className="text-sm text-slate-500">Đơn chưa có chi tiết món.</p>}
          </div>
        )}
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Tổng thanh toán</span>
        <span className="text-lg font-bold text-orange-600">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
      </div>
      {order.note && <p className="mt-3 text-sm text-slate-500">Ghi chú: {order.note}</p>}
      {next && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStatusChange(next)}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            {actionLabel[order.status]}
          </button>
          {order.status === "PENDING" && (
            <button type="button" onClick={() => setRejecting((value) => !value)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
              Từ chối
            </button>
          )}
        </div>
      )}
      {rejecting && (
        <div className="mt-3 flex gap-2">
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Lý do từ chối" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          <button type="button" onClick={() => onReject(note)} disabled={!note.trim()} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Gửi</button>
        </div>
      )}
    </article>
  );
}
