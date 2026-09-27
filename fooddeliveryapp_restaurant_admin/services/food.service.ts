import { restaurantMenuService } from "@/services/restaurant/menu.service";
import { foodMapper } from "@/services/mappers";
import type { CreateFoodInput, Food } from "@/types/food";

const restaurantId = () => Number(localStorage.getItem("restaurantId") ?? 1);

export const foodService = {
  async listMine(): Promise<Food[]> {
    const foods = await restaurantMenuService.listFoods();
    return foods.map(foodMapper.toCamelCase);
  },
  async create(input: CreateFoodInput): Promise<void> {
    await restaurantMenuService.createFood({
      restaurant_id: restaurantId(), category_id: input.categoryId, name: input.name,
      description: input.description, price: input.price, image: input.image, status_id: 1,
    });
  },
  async update(id: number, input: CreateFoodInput): Promise<void> {
    await restaurantMenuService.updateFood(id, {
      category_id: input.categoryId, name: input.name, description: input.description,
      price: input.price, image: input.image,
    });
  },
  async updateStatus(id: number, status: Food["status"]): Promise<void> {
    await restaurantMenuService.updateFood(id, { status_id: status === "AVAILABLE" ? 1 : 2 });
  },
  async remove(id: number): Promise<void> {
    await restaurantMenuService.removeFood(id);
  },
};
