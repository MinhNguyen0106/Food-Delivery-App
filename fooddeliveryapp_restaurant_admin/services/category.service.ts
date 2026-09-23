import { restaurantMenuService } from "@/services/restaurant/menu.service";
import { categoryMapper } from "@/services/mappers";
import type { Category } from "@/types/category";

export const categoryService = {
  async getActive(): Promise<Category[]> {
    const categories = await restaurantMenuService.listCategories();
    return categories
      .filter(cat => cat.is_active)
      .map(categoryMapper.toCamelCase);
  },

  async getAll(): Promise<Category[]> {
    const categories = await restaurantMenuService.listCategories();
    return categories.map(categoryMapper.toCamelCase);
  },

  async getById(id: number): Promise<Category> {
    const category = await restaurantMenuService.getCategory(id);
    return categoryMapper.toCamelCase(category);
  },
};
