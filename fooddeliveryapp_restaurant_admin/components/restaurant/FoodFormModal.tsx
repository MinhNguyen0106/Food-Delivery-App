"use client";

import { useState } from "react";
import type { Category } from "@/types/category";
import type { CreateFoodInput, Food } from "@/types/food";

export function FoodFormModal({
  food,
  categories,
  onClose,
  onSubmit,
}: {
  food?: Food | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (input: CreateFoodInput) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateFoodInput>({
    name: food?.name ?? "",
    description: food?.description ?? "",
    price: food?.price ?? 0,
    categoryId: food?.categoryId ?? categories[0]?.categoryId ?? 0,
    image: food?.image ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || form.price < 0 || !form.categoryId) return;
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex justify-between"><h2 className="text-lg font-bold">{food ? "Sửa món ăn" : "Thêm món ăn"}</h2><button type="button" onClick={onClose} className="text-slate-400">✕</button></div>
        <div className="space-y-3">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên món" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <input required min="0" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Giá" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value={0}>Chọn danh mục</option>
            {categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}
          </select>
          <input value={form.image ?? ""} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="URL hình ảnh (không bắt buộc)" className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu món"}</button></div>
      </form>
    </div>
  );
}
