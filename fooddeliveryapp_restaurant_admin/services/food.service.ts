import { restaurantMenuService } from "@/services/restaurant/menu.service";
import { foodMapper } from "@/services/mappers";
import type { CreateFoodInput, Food } from "@/types/food";

export const foodService = {
  async listMine(): Promise<Food[]> {
    const foods = await restaurantMenuService.listFoods();
    return foods.map(foodMapper.toCamelCase);
  },

  async getById(id: number): Promise<Food> {
    const food = await restaurantMenuService.getFood(id);
    return foodMapper.toCamelCase(food);
  },

  async create(input: CreateFoodInput): Promise<Food> {
    const payload = foodMapper.fromCreateInput(input);
    await restaurantMenuService.createFood(payload);
    return { 
      foodId: 0, 
      restaurantId: payload.restaurant_id, 
      categoryId: payload.category_id,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      image: payload.image,
      status: payload.status_id === 1 ? "AVAILABLE" : "UNAVAILABLE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async update(id: number, input: CreateFoodInput): Promise<Food> {
    const payload = foodMapper.fromCreateInput(input);
    await restaurantMenuService.updateFood(id, payload);
    const food = await restaurantMenuService.getFood(id);
    return foodMapper.toCamelCase(food);
  },

  async updateStatus(id: number, status: "AVAILABLE" | "UNAVAILABLE"): Promise<Food> {
    const statusId = status === "AVAILABLE" ? 1 : 2;
    await restaurantMenuService.updateFood(id, { status_id: statusId });
    const food = await restaurantMenuService.getFood(id);
    return foodMapper.toCamelCase(food);
  },

  async remove(id: number): Promise<void> {
    await restaurantMenuService.removeFood(id);
  },
};
