import type { OrderStatus } from "@/types/order";
import type { FoodStatus } from "@/types/food";

const styles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-indigo-100 text-indigo-800",
  READY_FOR_PICKUP: "bg-purple-100 text-purple-800",
  PICKED_UP: "bg-cyan-100 text-cyan-800",
  DELIVERING: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-100 text-slate-700",
  REJECTED: "bg-red-100 text-red-800",
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  UNAVAILABLE: "bg-slate-100 text-slate-600",
};

const labels: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chuẩn bị",
  READY_FOR_PICKUP: "Sẵn sàng lấy",
  PICKED_UP: "Đã lấy món",
  DELIVERING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REJECTED: "Đã từ chối",
  AVAILABLE: "Đang bán",
  UNAVAILABLE: "Tạm hết",
};

export function StatusBadge({
  status,
}: {
  status: OrderStatus | FoodStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
