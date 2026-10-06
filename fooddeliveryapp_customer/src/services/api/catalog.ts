import { apiRequest, resolveApiAssetUrl } from '@/services/api/client';
import type { Food, Restaurant } from '@/data/demo';

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface RestaurantReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
}

function requireArray(value: unknown, entity: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Máy chủ trả về danh sách ${entity} không đúng cấu trúc.`);
  }
  return value;
}

function requireObject(value: unknown, entity: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Máy chủ trả về thông tin ${entity} không đúng cấu trúc.`);
  }
  return value as Record<string, unknown>;
}

function requireNumber(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Máy chủ trả về trường ${field} không hợp lệ.`);
  }
  return number;
}

function requireId(value: unknown, field: string): number {
  const id = requireNumber(value, field);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(`Máy chủ trả về mã ${field} không hợp lệ.`);
  }
  return id;
}

function requireNonNegativeNumber(value: unknown, field: string): number {
  const number = requireNumber(value, field);
  if (number < 0) {
    throw new Error(`Máy chủ trả về trường ${field} không hợp lệ.`);
  }
  return number;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Máy chủ trả về trường ${field} không hợp lệ.`);
  }
  return value;
}

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : '';
}

function mapCategory(value: unknown): Category {
  const category = requireObject(value, 'danh mục');
  return {
    id: requireId(category.category_id, 'category_id'),
    name: requireString(category.name, 'category.name'),
    description:
      category.description === null || category.description === undefined
        ? ''
        : requireString(category.description, 'category.description'),
  };
}

function mapRestaurantReview(value: unknown): RestaurantReview {
  const review = requireObject(value, 'đánh giá nhà hàng');
  const rating = requireNumber(review.rating, 'review.rating');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Máy chủ trả về điểm đánh giá không hợp lệ.');
  }
  return {
    id: requireId(review.review_id, 'review_id'),
    rating,
    comment:
      review.comment === null || review.comment === undefined
        ? null
        : requireString(review.comment, 'review.comment'),
    createdAt: requireString(review.created_at, 'review.created_at'),
  };
}

function mapRestaurant(value: unknown): Restaurant {
  const restaurant = requireObject(value, 'nhà hàng');
  const openValue = restaurant.is_open;
  if (typeof openValue !== 'boolean' && openValue !== 0 && openValue !== 1) {
    throw new Error('Máy chủ trả về trạng thái nhà hàng không hợp lệ.');
  }
  const open = openValue === true || openValue === 1;
  const distanceKm =
    restaurant.distance_km === undefined || restaurant.distance_km === null
      ? undefined
      : requireNonNegativeNumber(restaurant.distance_km, 'distance_km');
  const address =
    restaurant.address === null || restaurant.address === undefined
      ? ''
      : requireString(restaurant.address, 'restaurant.address');
  const description =
    restaurant.description === null || restaurant.description === undefined
      ? ''
      : requireString(restaurant.description, 'restaurant.description');
  const image =
    restaurant.image === null || restaurant.image === undefined
      ? null
      : requireString(restaurant.image, 'restaurant.image');
  const phone =
    restaurant.phone === null || restaurant.phone === undefined
      ? ''
      : requireString(restaurant.phone, 'restaurant.phone');
  const openingTimeValue = restaurant.opening_time;
  const closingTimeValue = restaurant.closing_time;
  const openingTime = formatTime(
    openingTimeValue === null || openingTimeValue === undefined
      ? null
      : requireString(openingTimeValue, 'opening_time'),
  );
  const closingTime = formatTime(
    closingTimeValue === null || closingTimeValue === undefined
      ? null
      : requireString(closingTimeValue, 'closing_time'),
  );

  return {
    id: requireId(restaurant.restaurant_id, 'restaurant_id'),
    name: requireString(restaurant.name, 'restaurant.name'),
    latitude:
      restaurant.latitude === null || restaurant.latitude === undefined
        ? undefined
        : requireNumber(restaurant.latitude, 'restaurant.latitude'),
    longitude:
      restaurant.longitude === null || restaurant.longitude === undefined
        ? undefined
        : requireNumber(restaurant.longitude, 'restaurant.longitude'),
    phone,
    cuisine: address,
    address,
    description,
    image: resolveApiAssetUrl(image),
    rating: requireNonNegativeNumber(restaurant.rating_average, 'rating_average'),
    distance: distanceKm === undefined ? '' : `${distanceKm.toFixed(1)} km`,
    deliveryMinutes: '',
    open,
    openAt: openingTime && closingTime ? `${openingTime}–${closingTime}` : '',
    categories: [],
  };
}

function mapFood(value: unknown): Food {
  const food = requireObject(value, 'món ăn');
  const status = requireString(food.status, 'food.status');
  if (status !== 'AVAILABLE' && status !== 'UNAVAILABLE') {
    throw new Error('Máy chủ trả về trạng thái món ăn không hợp lệ.');
  }
  const description =
    food.description === null || food.description === undefined
      ? ''
      : requireString(food.description, 'food.description');
  const image =
    food.image === null || food.image === undefined
      ? null
      : requireString(food.image, 'food.image');
  return {
    id: requireId(food.food_id, 'food_id'),
    restaurantId: requireId(food.restaurant_id, 'restaurant_id'),
    name: requireString(food.name, 'food.name'),
    description,
    category: requireString(food.category_name, 'food.category_name'),
    categoryId: requireId(food.category_id, 'category_id'),
    restaurantName: requireString(food.restaurant_name, 'restaurant_name'),
    price: requireNonNegativeNumber(food.price, 'food.price'),
    image: resolveApiAssetUrl(image),
    available: status === 'AVAILABLE',
  };
}

function queryString(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listCategories(token: string): Promise<Category[]> {
  const data = await apiRequest<unknown>('/categories', { token });
  return requireArray(data, 'danh mục').map(mapCategory);
}

export async function listRestaurants(
  token: string,
  filters: {
    q?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    isOpen?: boolean;
    latitude?: number;
    longitude?: number;
    maxDistanceKm?: number;
  } = {},
): Promise<Restaurant[]> {
  const data = await apiRequest<unknown>(
    `/restaurants${queryString(filters)}`,
    { token },
  );
  return requireArray(data, 'nhà hàng').map(mapRestaurant);
}

export async function getRestaurant(token: string, restaurantId: number): Promise<Restaurant> {
  const data = await apiRequest<unknown>(`/restaurants/${restaurantId}`, { token });
  return mapRestaurant(data);
}

export async function listRestaurantReviews(
  token: string,
  restaurantId: number,
): Promise<RestaurantReview[]> {
  const data = await apiRequest<unknown>(
    `/reviews/restaurant/${restaurantId}`,
    { token },
  );
  return requireArray(data, 'đánh giá nhà hàng').map(mapRestaurantReview);
}

export async function listRestaurantCategories(
  token: string,
  restaurantId: number,
): Promise<Category[]> {
  const data = await apiRequest<unknown>(`/restaurants/${restaurantId}/categories`, { token });
  return requireArray(data, 'danh mục nhà hàng').map(mapCategory);
}

export async function listFoods(
  token: string,
  filters: {
    q?: string;
    restaurantId?: number;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
  } = {},
): Promise<Food[]> {
  const data = await apiRequest<unknown>(`/foods${queryString(filters)}`, { token });
  return requireArray(data, 'món ăn').map(mapFood);
}

export async function getFood(token: string, foodId: number): Promise<Food> {
  const data = await apiRequest<unknown>(`/foods/${foodId}`, { token });
  return mapFood(data);
}
