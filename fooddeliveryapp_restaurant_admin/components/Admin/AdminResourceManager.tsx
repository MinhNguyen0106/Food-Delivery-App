"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminService } from "@/services/admin/admin.service";
import { adminVoucherService } from "@/services/admin/voucher.service";
import { authService } from "@/services/auth.service";
import { categoryService } from "@/services/category.service";
import { reviewService } from "@/services/review.service";
import type {
  AdminOrderDetailRecord,
  RestaurantAdminRecord,
  ShipperAdminRecord,
  VoucherRecord,
  VoucherWriteInput,
} from "@/types/service-api";
import type { CreateAdminCategoryPayload } from "@/types/admin";

export type AdminResource = "categories" | "customers" | "restaurants" | "shippers" | "orders" | "reviews" | "vouchers";
type ResourceRow = Record<string, unknown>;
type Field = { key: string; label: string; type?: "text" | "email" | "tel" | "password" | "date" | "time" | "number" | "textarea" | "checkbox" | "select" | "datetime-local"; required?: boolean; min?: number; max?: number; step?: number | "any"; minLength?: number; maxLength?: number; options?: string[] };
type Column = { key: string; label: string };

const configurations: Record<AdminResource, { title: string; description: string; columns: Column[]; fields?: Field[]; limitation?: string }> = {
  categories: {
    title: "Danh mục món ăn", description: "Quản lý danh mục dùng chung trên nền tảng.",
    columns: [{ key: "name", label: "Tên danh mục" }, { key: "description", label: "Mô tả" }, { key: "is_active", label: "Trạng thái" }, { key: "created_at", label: "Ngày tạo" }],
    fields: [{ key: "name", label: "Tên danh mục", required: true }, { key: "description", label: "Mô tả", type: "textarea" }, { key: "is_active", label: "Đang hoạt động", type: "checkbox" }],
  },
  customers: {
    title: "Khách hàng", description: "Tìm kiếm và kiểm soát trạng thái tài khoản khách hàng.",
    columns: [{ key: "full_name", label: "Khách hàng" }, { key: "email", label: "Email" }, { key: "phone", label: "Điện thoại" }, { key: "account_status", label: "Tài khoản" }, { key: "created_at", label: "Ngày tạo" }],
    fields: [{ key: "fullName", label: "Họ và tên", required: true }, { key: "email", label: "Email", required: true }, { key: "phone", label: "Điện thoại", required: true }, { key: "password", label: "Mật khẩu tạm thời", type: "password", required: true }, { key: "dateOfBirth", label: "Ngày sinh", type: "date" }],
    limitation: "Có thể tạo khách hàng qua API đăng ký. Backend Admin chỉ hỗ trợ khóa/mở khóa; chưa có API sửa hồ sơ hoặc xóa tài khoản.",
  },
  restaurants: {
    title: "Nhà hàng", description: "Theo dõi hồ sơ đối tác và trạng thái hoạt động.",
    columns: [{ key: "name", label: "Nhà hàng" }, { key: "address", label: "Địa chỉ" }, { key: "phone", label: "Điện thoại" }, { key: "status", label: "Trạng thái nhà hàng" }, { key: "account_status", label: "Tài khoản" }],
    fields: [
      { key: "name", label: "Tên nhà hàng", required: true },
      { key: "email", label: "Email đăng nhập", type: "email", required: true },
      { key: "password", label: "Mật khẩu", type: "password", required: true, minLength: 8, maxLength: 72 },
      { key: "phone", label: "Điện thoại", type: "tel", required: true },
      { key: "address", label: "Địa chỉ", required: true },
      { key: "latitude", label: "Vĩ độ", type: "number", required: true, min: -90, max: 90, step: 0.0000001 },
      { key: "longitude", label: "Kinh độ", type: "number", required: true, min: -180, max: 180, step: 0.0000001 },
      { key: "description", label: "Mô tả", type: "textarea" },
      { key: "openingTime", label: "Giờ mở cửa", type: "time" },
      { key: "closingTime", label: "Giờ đóng cửa", type: "time" },
    ],
    limitation: "Tài khoản nhà hàng được tạo ở trạng thái hoạt động và nhà hàng chờ duyệt.",
  },
  shippers: {
    title: "Đội ngũ shipper", description: "Theo dõi tài khoản và tình trạng sẵn sàng giao hàng.",
    columns: [{ key: "full_name", label: "Shipper" }, { key: "email", label: "Email" }, { key: "phone", label: "Điện thoại" }, { key: "availability", label: "Sẵn sàng" }, { key: "account_status", label: "Tài khoản" }],
    fields: [
      { key: "fullName", label: "Họ và tên", required: true },
      { key: "email", label: "Email đăng nhập", type: "email", required: true },
      { key: "password", label: "Mật khẩu", type: "password", required: true, minLength: 8, maxLength: 72 },
      { key: "phone", label: "Điện thoại", type: "tel", required: true },
    ],
    limitation: "Tài khoản shipper được tạo ở trạng thái hoạt động và sẵn sàng giao hàng ban đầu là ngoại tuyến.",
  },
  orders: {
    title: "Đơn hàng", description: "Tra cứu đơn và kiểm tra chi tiết thanh toán, giao hàng, lịch sử.",
    columns: [{ key: "order_code", label: "Mã đơn" }, { key: "customer_name", label: "Khách hàng" }, { key: "restaurant_name", label: "Nhà hàng" }, { key: "total_amount", label: "Tổng tiền" }, { key: "status", label: "Trạng thái" }, { key: "created_at", label: "Ngày tạo" }],
    limitation: "Backend hiện chỉ cung cấp API theo dõi và xem chi tiết đơn hàng cho Admin; chưa có API tạo đơn, đổi trạng thái hoặc hủy đơn.",
  },
  reviews: {
    title: "Đánh giá", description: "Kiểm duyệt nội dung đánh giá của khách hàng.",
    columns: [{ key: "customer_name", label: "Khách hàng" }, { key: "restaurant_name", label: "Nhà hàng" }, { key: "rating", label: "Điểm" }, { key: "comment", label: "Nội dung" }, { key: "status", label: "Hiển thị" }],
    limitation: "Backend hiện chỉ cung cấp xem và ẩn/hiện đánh giá; chưa có API cho Admin tạo/sửa hoặc liên kết review với món ăn.",
  },
  vouchers: {
    title: "Mã giảm giá", description: "Quản lý mã, điều kiện sử dụng và thời hạn khuyến mãi.",
    columns: [{ key: "discount_value", label: "Giảm giá" }, { key: "min_order_value", label: "Đơn tối thiểu" }, { key: "used_count", label: "Đã dùng" }, { key: "usage_limit", label: "Lượt dùng" }, { key: "status", label: "Trạng thái" }, { key: "end_date", label: "Hết hạn" }],
    fields: [
      { key: "code", label: "Mã voucher", required: true },
      { key: "discount_value", label: "Giá trị giảm", type: "number", required: true },
      { key: "min_order_value", label: "Giá trị đơn tối thiểu", type: "number", required: true },
      { key: "usage_limit", label: "Số lượt sử dụng", type: "number", required: true },
      { key: "status", label: "Trạng thái", type: "select", options: ["ACTIVE", "INACTIVE", "EXPIRED"] },
      { key: "start_date", label: "Bắt đầu", type: "datetime-local", required: true },
      { key: "end_date", label: "Kết thúc", type: "datetime-local", required: true },
    ],
  },
};

function toRows<T>(records: T[]): ResourceRow[] {
  return records as unknown as ResourceRow[];
}

async function loadResource(resource: AdminResource, query: string): Promise<ResourceRow[]> {
  switch (resource) {
    case "categories": return toRows(await categoryService.getCategories());
    case "customers": return toRows(await adminService.getCustomers({ q: query || undefined }));
    case "restaurants": return toRows(await adminService.getRestaurants({ q: query || undefined }));
    case "shippers": return toRows(await adminService.getShippers({ q: query || undefined }));
    case "orders": return toRows(await adminService.getOrders({ q: query || undefined }));
    case "reviews": {
      const [reviews, customers] = await Promise.all([reviewService.getReviews(), adminService.getCustomers()]);
      const names = new Map(customers.map((customer) => [customer.customer_id, customer.full_name]));
      return toRows(reviews.map((review) => ({
        ...review,
        customer_name: names.get(review.customer_id ?? 0) ?? `Khách #${review.customer_id ?? "?"}`,
      })));
    }
    case "vouchers": return toRows(await adminVoucherService.list());
  }
}

function rowId(resource: AdminResource, row: ResourceRow): number {
  const key: Record<AdminResource, string> = { categories: "category_id", customers: "customer_id", restaurants: "restaurant_id", shippers: "shipper_id", orders: "order_id", reviews: "review_id", vouchers: "voucher_id" };
  return Number(row[key[resource]]);
}

function dateInput(value: unknown) {
  return typeof value === "string" ? value.slice(0, 16).replace(" ", "T") : "";
}

function displayValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "is_active") return value === true || value === 1 ? "Đang hoạt động" : "Đã khóa";
  if (key === "total_amount" || key === "discount_value" || key === "min_order_value") return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
  if (key.endsWith("_at") || key.endsWith("_date")) {
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.valueOf()) ? String(value) : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: key.endsWith("_at") ? "short" : undefined }).format(parsed);
  }
  const labels: Record<string, string> = { ACTIVE: "Hoạt động", INACTIVE: "Ngừng hoạt động", EXPIRED: "Hết hạn", LOCKED: "Đã khóa", PENDING: "Chờ duyệt", REJECTED: "Từ chối", SUSPENDED: "Tạm ngưng", VISIBLE: "Đang hiển thị", HIDDEN: "Đã ẩn", OFFLINE: "Ngoại tuyến", ONLINE: "Sẵn sàng", BUSY: "Đang giao", CONFIRMED: "Đã tiếp nhận", PREPARING: "Đang chuẩn bị", READY_FOR_PICKUP: "Chờ lấy hàng", PICKED_UP: "Đã lấy hàng", DELIVERING: "Đang giao", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy" };
  return labels[String(value)] ?? String(value);
}

export default function AdminResourceManager({ resource }: { resource: AdminResource }) {
  const config = configurations[resource];
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<number, string>>({});
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetailRecord | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      loadResource(resource, query.trim()).then((items) => { if (active) setRows(items); })
        .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu."); })
        .finally(() => { if (active) setLoading(false); });
    }, query ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [resource, query, refreshKey]);

  const shownRows = ["categories", "vouchers", "reviews"].includes(resource) && query.trim()
    ? rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase())))
    : rows;

  function openCreate() {
    setEditing(null);
    if (resource === "categories") setValues({ name: "", description: "", is_active: true });
    else if (resource === "customers") setValues({ fullName: "", email: "", phone: "", password: "", dateOfBirth: "" });
    else if (resource === "shippers") setValues({ fullName: "", email: "", phone: "", password: "" });
    else if (resource === "restaurants") setValues({ name: "", email: "", phone: "", password: "", address: "", latitude: "", longitude: "", description: "", openingTime: "", closingTime: "" });
    else setValues({ code: "", discount_value: "", min_order_value: "0", usage_limit: "1", status: "ACTIVE", start_date: "", end_date: "" });
    setCreating(true);
  }

  function openEdit(row: ResourceRow) {
    setEditing(row);
    if (resource === "categories") setValues({ name: String(row.name ?? ""), description: String(row.description ?? ""), is_active: row.is_active === true || row.is_active === 1 });
    else setValues({ code: String(row.code ?? ""), discount_value: String(row.discount_value ?? ""), min_order_value: String(row.min_order_value ?? "0"), usage_limit: String(row.usage_limit ?? "1"), status: String(row.status ?? "ACTIVE"), start_date: dateInput(row.start_date), end_date: dateInput(row.end_date) });
    setCreating(false);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (resource === "customers") {
        await authService.registerCustomer({
          fullName: String(values.fullName).trim(),
          email: String(values.email).trim(),
          phone: String(values.phone).trim(),
          password: String(values.password),
          dateOfBirth: String(values.dateOfBirth || "") || null,
        });
      } else if (resource === "shippers") {
        await adminService.createShipper({
          fullName: String(values.fullName).trim(),
          email: String(values.email).trim(),
          phone: String(values.phone).trim(),
          password: String(values.password),
        });
      } else if (resource === "restaurants") {
        await adminService.createRestaurant({
          name: String(values.name).trim(),
          email: String(values.email).trim(),
          phone: String(values.phone).trim(),
          password: String(values.password),
          address: String(values.address).trim(),
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          description: String(values.description ?? "").trim(),
          openingTime: String(values.openingTime || "") || undefined,
          closingTime: String(values.closingTime || "") || undefined,
        });
      } else if (resource === "categories") {
        const payload: CreateAdminCategoryPayload = { name: String(values.name).trim(), description: String(values.description ?? "").trim() || null, is_active: Boolean(values.is_active) };
        if (editing) await categoryService.updateCategory(rowId(resource, editing), payload);
        else await categoryService.createCategory(payload);
      } else if (resource === "vouchers") {
        const toSqlDate = (value: string | boolean) => `${String(value).replace("T", " ")}:00`;
        const payload: VoucherWriteInput = {
          code: String(values.code).trim(), discount_value: Number(values.discount_value), min_order_value: Number(values.min_order_value), usage_limit: Number(values.usage_limit), status: String(values.status) as VoucherRecord["status"], start_date: toSqlDate(values.start_date), end_date: toSqlDate(values.end_date),
        };
        if (editing) await adminVoucherService.replaceVoucher(rowId(resource, editing), payload);
        else await adminVoucherService.create(payload);
      }
      setCreating(false);
      setEditing(null);
      setNotice(resource === "shippers" ? "Đã tạo tài khoản shipper." : resource === "restaurants" ? "Đã tạo tài khoản nhà hàng." : editing ? "Đã cập nhật dữ liệu." : "Đã tạo dữ liệu.");
      setRefreshKey((key) => key + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu dữ liệu."); }
    finally { setSaving(false); }
  }

  async function removeRow(row: ResourceRow) {
    if (!window.confirm("Xóa bản ghi này? Thao tác có thể không hoàn tác được.")) return;
    setError("");
    try {
      if (resource === "categories") await categoryService.deleteCategory(rowId(resource, row));
      if (resource === "vouchers") await adminVoucherService.remove(rowId(resource, row));
      setNotice("Đã xóa bản ghi.");
      setRefreshKey((key) => key + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xóa bản ghi."); }
  }

  async function updateStatus(row: ResourceRow, next: string) {
    const id = rowId(resource, row);
    setError("");
    try {
      if (resource === "customers") await adminService.setCustomerStatus(id, next as "ACTIVE" | "LOCKED");
      if (resource === "restaurants") await adminService.setRestaurantStatus(id, next as RestaurantAdminRecord["status"]);
      if (resource === "shippers") await adminService.setShipperAccountStatus(id, next as ShipperAdminRecord["account_status"]);
      if (resource === "reviews") await reviewService.setModerationStatus(id, next as "VISIBLE" | "HIDDEN");
      setNotice("Đã cập nhật trạng thái.");
      setRefreshKey((key) => key + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái."); }
  }

  async function showOrder(row: ResourceRow) {
    try { setOrderDetail(await adminService.getOrder(rowId(resource, row))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết đơn hàng."); }
  }

  function rowActions(row: ResourceRow) {
    const id = rowId(resource, row);
    if (resource === "categories" || resource === "vouchers") return <div className="flex items-center gap-3 whitespace-nowrap"><button onClick={() => openEdit(row)} className="text-sm font-semibold text-[#326b49] hover:underline">Sửa</button><button onClick={() => void removeRow(row)} className="text-sm font-semibold text-[#a34837] hover:underline">Xóa</button></div>;
    if (resource === "customers") {
      const status = String(row.account_status ?? "ACTIVE");
      return <button onClick={() => void updateStatus(row, status === "LOCKED" ? "ACTIVE" : "LOCKED")} className="text-sm font-semibold text-[#326b49] hover:underline">{status === "LOCKED" ? "Mở khóa" : "Khóa"}</button>;
    }
    if (resource === "shippers") {
      const status = String(row.account_status ?? "ACTIVE");
      return <button onClick={() => void updateStatus(row, status === "LOCKED" ? "ACTIVE" : "LOCKED")} className="text-sm font-semibold text-[#326b49] hover:underline">{status === "LOCKED" ? "Mở khóa" : "Khóa"}</button>;
    }
    if (resource === "restaurants") return <div className="flex items-center gap-2"><select aria-label="Trạng thái mới" className="h-8 max-w-32 rounded border border-[#dce4dc] bg-white px-2 text-xs" value={statusDrafts[id] ?? String(row.status)} onChange={(event) => setStatusDrafts({ ...statusDrafts, [id]: event.target.value })}>{["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"].map((status) => <option key={status} value={status}>{displayValue("status", status)}</option>)}</select><button onClick={() => void updateStatus(row, statusDrafts[id] ?? String(row.status))} className="text-xs font-semibold text-[#326b49] hover:underline">Lưu</button></div>;
    if (resource === "reviews") {
      const current = String(row.status ?? "VISIBLE");
      return <button onClick={() => void updateStatus(row, current === "HIDDEN" ? "VISIBLE" : "HIDDEN")} className="text-sm font-semibold text-[#326b49] hover:underline">{current === "HIDDEN" ? "Hiện lại" : "Ẩn"}</button>;
    }
    if (resource === "orders") return <button onClick={() => void showOrder(row)} className="text-sm font-semibold text-[#326b49] hover:underline">Chi tiết</button>;
    return null;
  }

  return <div className="mx-auto max-w-345 px-5 py-8 md:px-9">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe6df] pb-6">
      <div><p className="text-xs font-semibold tracking-[0.14em] text-[#a06a3d]">QUẢN LÝ DỮ LIỆU</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{config.title}</h1><p className="mt-2 text-sm text-[#77847b]">{config.description}</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setNotice(""); setRefreshKey((key) => key + 1); }} disabled={loading} className="h-10 rounded border border-[#d7e0d8] bg-white px-4 text-sm font-semibold text-[#345a43] hover:bg-[#f6f8f5] disabled:opacity-50">↻ Làm mới</button>
        {config.fields && <button type="button" onClick={openCreate} className="h-10 rounded bg-[#1b533d] px-4 text-sm font-semibold text-white hover:bg-[#133e2e]">+ Thêm mới</button>}
      </div>
    </div>
    {config.limitation && <p className="mt-5 border-l-2 border-[#d39961] bg-[#faf8f3] px-4 py-3 text-sm leading-6 text-[#6d6759]">{config.limitation}</p>}
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <label className="relative block w-full max-w-md">
        <span className="sr-only">Tìm kiếm {config.title}</span>
        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89968e]">⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Tìm kiếm ${config.title.toLowerCase()}...`} className="h-10 w-full rounded border border-[#d7e0d8] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#39775a] focus:ring-2 focus:ring-[#39775a]/10" />
      </label>
      <p className="text-xs text-[#89948d]">{loading ? "Đang tải dữ liệu..." : `${shownRows.length} bản ghi`}</p>
    </div>
    {error && <p className="mt-4 rounded border border-[#e8c6ba] bg-[#fff5f1] px-4 py-3 text-sm text-[#a3432a]" role="alert">{error}</p>}
    {notice && <p className="mt-4 rounded border border-[#c9dfce] bg-[#f0f7f1] px-4 py-3 text-sm text-[#326b49]" role="status">{notice}</p>}
    <div className="mt-4 overflow-hidden rounded border border-[#e0e7e0] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-190 border-collapse text-left text-sm">
          <thead className="bg-[#f7f9f6] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77847b]"><tr>{config.columns.map((column) => <th key={column.key} className="whitespace-nowrap border-b border-[#e5ebe5] px-4 py-3">{column.label}</th>)}<th className="border-b border-[#e5ebe5] px-4 py-3">Thao tác</th></tr></thead>
          <tbody>
            {!loading && shownRows.map((row) => <tr key={rowId(resource, row)} className="border-b border-[#edf1ed] last:border-0 hover:bg-[#fbfcfa]">{config.columns.map((column) => <td key={column.key} className="max-w-64 px-4 py-3.5 text-[#435249]"><span className="block truncate" title={String(row[column.key] ?? "")}>{displayValue(column.key, row[column.key])}</span></td>)}<td className="px-4 py-3.5">{rowActions(row)}</td></tr>)}
            {!loading && shownRows.length === 0 && <tr><td colSpan={config.columns.length + 1} className="px-5 py-14 text-center text-sm text-[#87928b]">{error ? "Không thể hiển thị dữ liệu." : "Không có dữ liệu phù hợp."}</td></tr>}
            {loading && <tr><td colSpan={config.columns.length + 1} className="px-5 py-14 text-center text-sm text-[#87928b]">Đang tải danh sách...</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    {(creating || editing) && config.fields && <div className="fixed inset-0 z-40 grid place-items-center bg-[#12271d]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCreating(false); setEditing(null); } }}>
      <section role="dialog" aria-modal="true" aria-labelledby="resource-form-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded border border-[#dfe6df] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.13em] text-[#a06a3d]">{config.title.toUpperCase()}</p><h2 id="resource-form-title" className="mt-1 text-xl font-semibold">{editing ? "Chỉnh sửa thông tin" : "Thêm bản ghi mới"}</h2></div><button aria-label="Đóng" onClick={() => { setCreating(false); setEditing(null); }} className="grid h-8 w-8 place-items-center rounded text-xl text-[#77847b] hover:bg-[#f2f5f1]">×</button></div>
        <form onSubmit={submitForm} className="mt-6 space-y-4">
          {config.fields.map((field) => <label key={field.key} className={`block text-sm font-medium text-[#405148] ${field.type === "checkbox" ? "flex items-center gap-3" : ""}`}>
            {field.type === "checkbox" ? <><input type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => setValues({ ...values, [field.key]: event.target.checked })} className="h-4 w-4 accent-[#286344]" />{field.label}</> : <>{field.label}{field.type === "textarea" ? <textarea required={field.required} value={String(values[field.key] ?? "")} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} rows={3} className="mt-1.5 block w-full rounded border border-[#d7e0d8] px-3 py-2 outline-none focus:border-[#39775a]" /> : field.type === "select" ? <select value={String(values[field.key] ?? "")} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} className="mt-1.5 block h-10 w-full rounded border border-[#d7e0d8] bg-white px-3 outline-none focus:border-[#39775a]">{field.options?.map((option) => <option key={option} value={option}>{displayValue(field.key, option)}</option>)}</select> : <input type={field.type ?? "text"} required={field.required} min={field.min ?? (field.type === "number" ? 0 : undefined)} max={field.max} step={field.step ?? (field.type === "number" ? "any" : undefined)} minLength={field.minLength} maxLength={field.maxLength} value={String(values[field.key] ?? "")} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} className="mt-1.5 block h-10 w-full rounded border border-[#d7e0d8] px-3 outline-none focus:border-[#39775a]" />}</>}
          </label>)}
          {error && <p className="text-sm text-[#a3432a]" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#edf1ed] pt-4"><button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="h-10 rounded border border-[#d7e0d8] px-4 text-sm font-medium">Hủy</button><button disabled={saving} className="h-10 rounded bg-[#1b533d] px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Đang lưu..." : creating ? "Tạo mới" : "Lưu thay đổi"}</button></div>
        </form>
      </section>
    </div>}

    {orderDetail && <div className="fixed inset-0 z-40 grid place-items-center bg-[#12271d]/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOrderDetail(null); }}><section role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-2xl"><div className="flex justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.12em] text-[#a06a3d]">CHI TIẾT ĐƠN HÀNG</p><h2 id="order-detail-title" className="mt-1 text-xl font-semibold">{orderDetail.order_code}</h2></div><button onClick={() => setOrderDetail(null)} aria-label="Đóng" className="text-2xl text-[#77847b]">×</button></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-[#87928b]">Khách hàng</span><br />{orderDetail.customer_name ?? "—"}</p><p><span className="text-[#87928b]">Nhà hàng</span><br />{orderDetail.restaurant_name}</p><p><span className="text-[#87928b]">Trạng thái</span><br />{displayValue("status", orderDetail.status)}</p><p><span className="text-[#87928b]">Địa chỉ nhận</span><br />{orderDetail.full_address}</p></div><h3 className="mt-6 border-b border-[#e7ece7] pb-2 text-sm font-semibold">Món trong đơn</h3><div className="divide-y divide-[#edf1ed]">{orderDetail.items.map((item) => <div key={item.order_detail_id} className="flex justify-between gap-4 py-3 text-sm"><span>{item.food_name} × {item.quantity}</span><span>{displayValue("total_amount", item.subtotal)}</span></div>)}</div><div className="mt-4 flex justify-between border-t border-[#e7ece7] pt-4 text-sm font-semibold"><span>Tổng cộng</span><span>{displayValue("total_amount", orderDetail.total_amount)}</span></div></section></div>}
  </div>;
}