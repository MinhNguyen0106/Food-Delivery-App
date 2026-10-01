"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FoodFormModal } from "@/components/restaurant/FoodFormModal";
import { categoryService } from "@/services/category.service";
import {
  restaurantMenuService,
} from "@/services/restaurant/menu.service";
import type { Category } from "@/types/category";
import type { CreateFoodInput, Food } from "@/types/food";

export default function MenuPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Food | null | undefined>(undefined);
  const [error, setError] = useState("");
  async function load() {
    try {
      const [foodList, categoryList] = await Promise.all([
        restaurantMenuService.listFoods(),
        categoryService.getCategories(),
      ]);
      setFoods(foodList);
      setCategories(
        categoryList.map((category) => ({
          categoryId: category.category_id,
          name: category.name,
          description: category.description,
          isActive: Boolean(category.is_active),
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải thực đơn");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function save(input: CreateFoodInput) {
    try {
      if (editing) {
        await restaurantMenuService.updateFood(editing.foodId, input);
      } else {
        await restaurantMenuService.createFood(input);
      }
      setFoods(await restaurantMenuService.listFoods());
      setEditing(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu món ăn");
    }
  }
  async function toggle(food: Food) {
    try {
      const nextStatus =
        food.status === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";
      const statuses = await restaurantMenuService.listFoodStatuses();
      const status = statuses.find((item) => item.status_name === nextStatus);
      if (!status) {
        throw new Error(`Trạng thái món "${nextStatus}" chưa được cấu hình`);
      }
      await restaurantMenuService.updateFoodStatus(food.foodId, status.status_id);
      const item = await restaurantMenuService.getFood(food.foodId);
      setFoods((current) =>
        current.map((value) => (value.foodId === item.foodId ? item : value)),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể cập nhật trạng thái",
      );
    }
  }
  async function remove(food: Food) {
    if (!window.confirm(`Xóa món "${food.name}"?`)) return;
    try {
      await restaurantMenuService.deleteFood(food.foodId);
      setFoods((current) =>
        current.filter((item) => item.foodId !== food.foodId),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xóa món");
    }
  }
  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-500">
            Danh mục nhà hàng
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Thực đơn</h1>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Thêm món
        </button>
      </div>
      {error && (
        <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {foods.map((food) => (
            <div
              key={food.foodId}
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">{food.name}</p>
                <p className="text-sm text-slate-500">
                  {food.price.toLocaleString("vi-VN")}đ ·{" "}
                  {food.category?.name ?? `Danh mục #${food.categoryId}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={food.status} />
                <button
                  onClick={() => void toggle(food)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium"
                >
                  {food.status === "AVAILABLE" ? "Tắt món" : "Bật món"}
                </button>
                <button
                  onClick={() => setEditing(food)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium"
                >
                  Sửa
                </button>
                <button
                  onClick={() => void remove(food)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
        {foods.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-500">
            Chưa có món ăn.
          </p>
        )}
      </div>
      {editing !== undefined && (
        <FoodFormModal
          key={editing?.foodId ?? "new"}
          food={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSubmit={save}
        />
      )}
    </section>
  );
}
