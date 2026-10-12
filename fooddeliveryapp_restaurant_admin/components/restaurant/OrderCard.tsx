"use client";

import { useState } from "react";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/order";
import { StatusBadge } from "@/components/shared/StatusBadge";

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  SCHEDULED: "PREPARING",
  PENDING: "PREPARING",
  CONFIRMED: "PREPARING",
  PROCESSING: "PREPARING",
  PREPARING: "READY_FOR_PICKUP",
};

const actionLabel: Partial<Record<OrderStatus, string>> = {
  SCHEDULED: "Bắt đầu chuẩn bị ngay",
  PENDING: "Bắt đầu chuẩn bị",
  CONFIRMED: "Bắt đầu chuẩn bị",
  PROCESSING: "Bắt đầu chuẩn bị",
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
  const [printing, setPrinting] = useState(false);
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

  async function printOrder() {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      setDetailError("Trình duyệt đã chặn cửa sổ in. Cho phép cửa sổ bật lên rồi thử lại.");
      return;
    }
    setPrinting(true);
    setDetailError("");
    try {
      const printableOrder = details ?? await orderService.getById(order.orderId);
      setDetails(printableOrder);
      const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
      })[character] ?? character);
      const items = printableOrder.details.map((item) => `
        <tr>
          <td>${item.quantity} × ${escapeHtml(item.food?.name ?? `Món #${item.foodId}`)}</td>
          <td>${item.subtotal.toLocaleString("vi-VN")}đ</td>
        </tr>
      `).join("");
      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
        <html lang="vi">
          <head>
            <meta charset="utf-8">
            <title>Phiếu đơn ${escapeHtml(printableOrder.orderCode)}</title>
            <style>
              body { font: 14px Arial, sans-serif; color: #111; margin: 32px; }
              h1, p { margin: 0 0 12px; }
              h1 { font-size: 22px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 9px 4px; border-bottom: 1px solid #ddd; text-align: left; }
              th:last-child, td:last-child { text-align: right; }
              .total { text-align: right; font-size: 18px; font-weight: bold; }
              @media print { body { margin: 12mm; } }
            </style>
          </head>
          <body>
            <h1>Phiếu đơn hàng ${escapeHtml(printableOrder.orderCode)}</h1>
            <p>Thời gian đặt: ${escapeHtml(new Date(printableOrder.createdAt).toLocaleString("vi-VN"))}</p>
            <p>Khách hàng: ${escapeHtml(printableOrder.receiverName ?? "—")}</p>
            <p>Số điện thoại: ${escapeHtml(printableOrder.receiverPhone ?? "—")}</p>
            <p>Địa chỉ giao: ${escapeHtml(printableOrder.deliveryAddress ?? "—")}</p>
            <p>Khung giờ khách chọn: ${printableOrder.scheduledFor ? escapeHtml(new Date(printableOrder.scheduledFor).toLocaleString("vi-VN")) : "—"}</p>
            <table>
              <thead><tr><th>Món ăn</th><th>Thành tiền</th></tr></thead>
              <tbody>${items || '<tr><td colspan="2">Không có món</td></tr>'}</tbody>
            </table>
            <p class="total">Tổng thanh toán: ${printableOrder.totalAmount.toLocaleString("vi-VN")}đ</p>
            ${printableOrder.note ? `<p>Ghi chú: ${escapeHtml(printableOrder.note)}</p>` : ""}
          </body>
        </html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (cause) {
      printWindow.close();
      setDetailError(cause instanceof Error ? cause.message : "Không thể chuẩn bị phiếu in.");
    } finally {
      setPrinting(false);
    }
  }

  async function advanceStatus(status: OrderStatus) {
    setDetailError("");
    try {
      await onStatusChange(status);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái đơn.");
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
          {order.scheduledFor ? (
            <p className="mt-1 text-sm text-slate-600">
              Khách chọn nhận lúc {new Date(order.scheduledFor).toLocaleString("vi-VN")}
            </p>
          ) : null}
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
      {(next || order.status === "PENDING" || order.status === "SCHEDULED") && (
        <div className="mt-5 flex flex-wrap gap-2">
          {next ? (
            <button
              type="button"
              onClick={() => void advanceStatus(next)}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              {actionLabel[order.status]}
            </button>
          ) : null}
          {["PENDING", "SCHEDULED"].includes(order.status) && (
            <button type="button" onClick={() => setRejecting((value) => !value)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
              {order.status === "SCHEDULED" ? "Từ chối lịch đặt" : "Từ chối"}
            </button>
          )}
        </div>
      )}
      {rejecting && (
        <div className="mt-3 flex gap-2">
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={order.status === "SCHEDULED" ? "Lý do từ chối lịch đặt" : "Lý do từ chối"} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          <button type="button" onClick={() => onReject(note)} disabled={!note.trim()} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Gửi</button>
        </div>
      )}
      {order.status === "READY_FOR_PICKUP" ? (
        <button
          type="button"
          onClick={() => void printOrder()}
          disabled={printing}
          className="mt-5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {printing ? "Đang chuẩn bị phiếu..." : "In đơn"}
        </button>
      ) : null}
      {detailError && !showDetails ? (
        <p role="alert" className="mt-3 text-sm text-red-700">{detailError}</p>
      ) : null}
    </article>
  );
}
