"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ListPagination } from "@/components/shared/ListPagination";
import { FoodFormModal } from "@/components/restaurant/FoodFormModal";
import { categoryService } from "@/services/category.service";
import {
  restaurantMenuService,
} from "@/services/restaurant/menu.service";
import { imageService } from "@/services/image.service";
import type { Category } from "@/types/category";
import type { CreateFoodInput, Food } from "@/types/food";

const FOODS_PER_PAGE = 10;

export default function MenuPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Food | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [uploadingFoodId, setUploadingFoodId] = useState<number | null>(null);

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
      setPage(1);
      setEditing(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu món ăn");
    }
  }

  async function uploadFoodImage(
    foodId: number,
    file: File,
    input: HTMLInputElement,
  ) {
    setError("");
    setUploadingFoodId(foodId);
    try {
      const result = await imageService.uploadFoodImage(foodId, file);
      setFoods((current) =>
        current.map((food) =>
          food.foodId === foodId ? { ...food, image: result.image } : food,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải ảnh món ăn");
    } finally {
      setUploadingFoodId(null);
      input.value = "";
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
  const pageCount = Math.max(1, Math.ceil(foods.length / FOODS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleFoods = foods.slice(
    (currentPage - 1) * FOODS_PER_PAGE,
    currentPage * FOODS_PER_PAGE,
  );

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Vận hành</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Thực đơn</h1>
          <p className="mt-2 text-sm text-slate-500">Quản lý món ăn, giá bán và tình trạng phục vụ.</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white"
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
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 md:px-5">
          <h2 className="text-sm font-semibold text-slate-800">Danh sách món</h2>
          <span className="text-xs text-slate-500">{foods.length} món</span>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleFoods.map((food) => (
            <div
              key={food.foodId}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-slate-50/70 md:px-5"
            >
              <div className="flex min-w-48 flex-1 items-center gap-3">
                {food.image ? (
                  <Image
                    src={food.image}
                    alt={`Ảnh món ${food.name}`}
                    width={56}
                    height={56}
                    unoptimized
                    className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={`Món ${food.name} chưa có ảnh`}
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] text-slate-400"
                  >
                    Chưa có ảnh
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{food.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{food.category?.name ?? `Danh mục #${food.categoryId}`}</p>
                </div>
              </div>
              <p className="min-w-28 text-sm font-semibold tabular-nums text-slate-800">{food.price.toLocaleString("vi-VN")}đ</p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={food.status} />
                <label
                  htmlFor={`food-image-${food.foodId}`}
                  className={`cursor-pointer rounded-lg border border-orange-200 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-50 focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 ${
                    uploadingFoodId !== null
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                  title="Chọn ảnh JPG, PNG hoặc WEBP, tối đa 5 MB"
                >
                  {uploadingFoodId === food.foodId ? "Đang tải..." : "Đổi ảnh"}
                </label>
                <input
                  id={`food-image-${food.foodId}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingFoodId !== null}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) {
                      void uploadFoodImage(
                        food.foodId,
                        file,
                        event.currentTarget,
                      );
                    }
                  }}
                />
                <button
                  onClick={() => void toggle(food)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {food.status === "AVAILABLE" ? "Tắt món" : "Bật món"}
                </button>
                <button
                  onClick={() => setEditing(food)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
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
        <ListPagination
          page={currentPage}
          pageSize={FOODS_PER_PAGE}
          total={foods.length}
          onPageChange={setPage}
        />
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
