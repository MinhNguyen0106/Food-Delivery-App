const db = require('../common/db').promise();

const restaurantOpenSql = `CASE
  WHEN r.opening_time IS NULL OR r.closing_time IS NULL THEN 0
  WHEN r.opening_time <= r.closing_time
    THEN CURRENT_TIME BETWEEN r.opening_time AND r.closing_time
  ELSE CURRENT_TIME >= r.opening_time OR CURRENT_TIME <= r.closing_time
END`;

const restaurantRatingSql = `(
  SELECT o.restaurant_id, AVG(review.rating) AS rating_average
  FROM reviews review
  JOIN review_statuses review_status ON review_status.status_id = review.status_id
  JOIN orders o ON o.order_id = review.order_id
  WHERE review_status.status_name = 'VISIBLE'
  GROUP BY o.restaurant_id
) restaurant_rating`;

function addFoodAvailabilityFilter(parts, params, filter) {
  const foodParts = ['f.restaurant_id = r.restaurant_id', "food_status.status_name = 'AVAILABLE'", 'category.is_active = TRUE'];
  if (filter.categoryId !== undefined) {
    foodParts.push('f.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.minPrice !== undefined) {
    foodParts.push('f.price >= ?');
    params.push(filter.minPrice);
  }
  if (filter.maxPrice !== undefined) {
    foodParts.push('f.price <= ?');
    params.push(filter.maxPrice);
  }
  parts.push(`EXISTS (
    SELECT 1 FROM foods f
    JOIN food_statuses food_status ON food_status.status_id = f.status_id
    JOIN categories category ON category.category_id = f.category_id
    WHERE ${foodParts.join(' AND ')}
  )`);
}

module.exports = {
  async listRestaurants(filter, actor) {
    const params = [];
    const selectDistance = filter.latitude !== undefined
      ? ', ST_Distance_Sphere(POINT(r.longitude, r.latitude), POINT(?, ?)) / 1000 AS distance_km'
      : '';
    if (filter.latitude !== undefined) params.push(filter.longitude, filter.latitude);
    const parts = [];
    if (actor.role === 'CUSTOMER') {
      parts.push("restaurant_status.status_name = 'ACTIVE'");
    } else if (actor.role === 'RESTAURANT') {
      parts.push('r.user_id = ?');
      params.push(actor.userId);
    }
    if (filter.q) {
      parts.push('(r.name LIKE ? OR r.address LIKE ?)');
      params.push(`%${filter.q.trim()}%`, `%${filter.q.trim()}%`);
    }
    if (filter.categoryId !== undefined || filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      addFoodAvailabilityFilter(parts, params, filter);
    }
    if (filter.minRating !== undefined) {
      parts.push('COALESCE(restaurant_rating.rating_average, 0) >= ?');
      params.push(filter.minRating);
    }
    if (filter.isOpen !== undefined) {
      parts.push(`${restaurantOpenSql} = ?`);
      params.push(filter.isOpen === 'true' ? 1 : 0);
    }
    if (filter.maxDistanceKm !== undefined) {
      parts.push('ST_Distance_Sphere(POINT(r.longitude, r.latitude), POINT(?, ?)) <= ?');
      params.push(filter.longitude, filter.latitude, filter.maxDistanceKm * 1000);
    }
    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
    const [rows] = await db.execute(
      `SELECT r.restaurant_id, r.name, r.address, r.phone, r.description,
        r.latitude, r.longitude, r.image, r.opening_time, r.closing_time,
        restaurant_status.status_name AS status,
        ${restaurantOpenSql} AS is_open,
        COALESCE(restaurant_rating.rating_average, 0) AS rating_average
        ${selectDistance}
       FROM restaurants r
       JOIN restaurant_statuses restaurant_status ON restaurant_status.status_id = r.status_id
       LEFT JOIN ${restaurantRatingSql} ON TRUE
       ${where}
       ORDER BY r.name`,
      params
    );
    return rows;
  },

  async getRestaurantById(id, actor) {
    const parts = ['r.restaurant_id = ?'];
    const params = [id];
    if (actor.role === 'CUSTOMER') {
      parts.push("restaurant_status.status_name = 'ACTIVE'");
    } else if (actor.role === 'RESTAURANT') {
      parts.push('r.user_id = ?');
      params.push(actor.userId);
    }
    const [rows] = await db.execute(
      `SELECT r.restaurant_id, r.name, r.address, r.phone, r.description,
        r.latitude, r.longitude, r.image, r.opening_time, r.closing_time,
        restaurant_status.status_name AS status,
        ${restaurantOpenSql} AS is_open,
        COALESCE(restaurant_rating.rating_average, 0) AS rating_average
       FROM restaurants r
       JOIN restaurant_statuses restaurant_status ON restaurant_status.status_id = r.status_id
       LEFT JOIN ${restaurantRatingSql} ON TRUE
       WHERE ${parts.join(' AND ')}
       LIMIT 1`,
      params
    );
    return rows[0] || null;
  },

  async listRestaurantCategories(restaurantId) {
    const [rows] = await db.execute(
      `SELECT DISTINCT category.category_id, category.name, category.description
       FROM restaurants r
       JOIN foods f ON f.restaurant_id = r.restaurant_id
       JOIN categories category ON category.category_id = f.category_id
       JOIN food_statuses food_status ON food_status.status_id = f.status_id
       WHERE r.restaurant_id = ?
         AND category.is_active = TRUE
         AND food_status.status_name = 'AVAILABLE'
       ORDER BY category.name`,
      [restaurantId]
    );
    return rows;
  },

  async restaurantIsVisible(id, actor) {
    const parts = ['r.restaurant_id = ?'];
    const params = [id];
    if (actor.role === 'CUSTOMER') parts.push("restaurant_status.status_name = 'ACTIVE'");
    if (actor.role === 'RESTAURANT') {
      parts.push('r.user_id = ?');
      params.push(actor.userId);
    }
    const [rows] = await db.execute(
      `SELECT 1 FROM restaurants r
       JOIN restaurant_statuses restaurant_status ON restaurant_status.status_id = r.status_id
       WHERE ${parts.join(' AND ')} LIMIT 1`,
      params
    );
    return rows.length > 0;
  },

  async listCategories(actor) {
    const where = actor.role === 'ADMIN' ? '' : 'WHERE is_active = TRUE';
    const [rows] = await db.execute(
      `SELECT category_id, name, description, is_active, created_at
       FROM categories ${where} ORDER BY name`
    );
    return rows;
  },

  async getCategoryById(id, actor) {
    const activeOnly = actor.role === 'ADMIN' ? '' : ' AND is_active = TRUE';
    const [rows] = await db.execute(
      `SELECT category_id, name, description, is_active, created_at
       FROM categories WHERE category_id = ?${activeOnly} LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async listFoods(filter, actor) {
    const parts = [];
    const params = [];
    if (actor.role === 'CUSTOMER') {
      parts.push("restaurant_status.status_name = 'ACTIVE'", "food_status.status_name = 'AVAILABLE'", 'category.is_active = TRUE');
    } else if (actor.role === 'RESTAURANT') {
      parts.push('restaurant.user_id = ?');
      params.push(actor.userId);
    }
    if (filter.restaurantId !== undefined) {
      parts.push('food.restaurant_id = ?');
      params.push(filter.restaurantId);
    }
    if (filter.categoryId !== undefined) {
      parts.push('food.category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.minPrice !== undefined) {
      parts.push('food.price >= ?');
      params.push(filter.minPrice);
    }
    if (filter.maxPrice !== undefined) {
      parts.push('food.price <= ?');
      params.push(filter.maxPrice);
    }
    if (filter.q) {
      parts.push('food.name LIKE ?');
      params.push(`%${filter.q.trim()}%`);
    }
    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
    const [rows] = await db.execute(
      `SELECT food.food_id, food.restaurant_id, restaurant.name AS restaurant_name,
        food.category_id, category.name AS category_name, food.name, food.description,
        food.price, food.image, food_status.status_name AS status,
        food.created_at, food.updated_at
       FROM foods food
       JOIN restaurants restaurant ON restaurant.restaurant_id = food.restaurant_id
       JOIN restaurant_statuses restaurant_status ON restaurant_status.status_id = restaurant.status_id
       JOIN categories category ON category.category_id = food.category_id
       JOIN food_statuses food_status ON food_status.status_id = food.status_id
       ${where}
       ORDER BY restaurant.name, category.name, food.name`,
      params
    );
    return rows;
  },

  async getFoodById(id, actor) {
    const parts = ['food.food_id = ?'];
    const params = [id];
    if (actor.role === 'CUSTOMER') {
      parts.push("restaurant_status.status_name = 'ACTIVE'", "food_status.status_name = 'AVAILABLE'", 'category.is_active = TRUE');
    } else if (actor.role === 'RESTAURANT') {
      parts.push('restaurant.user_id = ?');
      params.push(actor.userId);
    }
    const [rows] = await db.execute(
      `SELECT food.food_id, food.restaurant_id, restaurant.name AS restaurant_name,
        food.category_id, category.name AS category_name, food.name, food.description,
        food.price, food.image, food_status.status_name AS status,
        food.created_at, food.updated_at
       FROM foods food
       JOIN restaurants restaurant ON restaurant.restaurant_id = food.restaurant_id
       JOIN restaurant_statuses restaurant_status ON restaurant_status.status_id = restaurant.status_id
       JOIN categories category ON category.category_id = food.category_id
       JOIN food_statuses food_status ON food_status.status_id = food.status_id
       WHERE ${parts.join(' AND ')} LIMIT 1`,
      params
    );
    return rows[0] || null;
  },

  async getActiveCategory(categoryId, connection = db) {
    const [rows] = await connection.execute(
      'SELECT category_id FROM categories WHERE category_id = ? AND is_active = TRUE LIMIT 1 FOR SHARE',
      [categoryId]
    );
    return rows[0] || null;
  },

  async getFoodStatus(statusId, connection = db) {
    const [rows] = await connection.execute(
      'SELECT status_id, status_name FROM food_statuses WHERE status_id = ? LIMIT 1',
      [statusId]
    );
    return rows[0] || null;
  },

  async getFoodStatusId(statusName, connection = db) {
    const [rows] = await connection.execute(
      'SELECT status_id FROM food_statuses WHERE status_name = ? LIMIT 1',
      [statusName]
    );
    return rows[0]?.status_id || null;
  },

  async createFood(data, connection = db) {
    const [result] = await connection.execute(
      `INSERT INTO foods (restaurant_id, category_id, name, description, price, image, status_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.restaurantId, data.category_id, data.name.trim(), data.description ?? null,
        data.price, data.image ?? null, data.statusId]
    );
    return result.insertId;
  },

  async updateFood(id, restaurantId, data, connection = db) {
    const allowed = {
      category_id: 'category_id',
      name: 'name',
      description: 'description',
      price: 'price',
      image: 'image',
      status_id: 'status_id',
    };
    const fields = Object.keys(data).filter((field) => allowed[field]);
    const values = fields.map((field) => {
      if (field === 'name') return data[field].trim();
      return data[field];
    });
    if (fields.length === 0) return 0;
    const [result] = await connection.execute(
      `UPDATE foods SET ${fields.map((field) => `\`${allowed[field]}\` = ?`).join(', ')}
       WHERE food_id = ? AND restaurant_id = ?`,
      [...values, id, restaurantId]
    );
    return result.affectedRows;
  },

  async deleteFood(id, restaurantId) {
    const [result] = await db.execute(
      'DELETE FROM foods WHERE food_id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );
    return result.affectedRows;
  },

  async createCategory(data) {
    const [result] = await db.execute(
      'INSERT INTO categories (name, description, is_active) VALUES (?, ?, ?)',
      [data.name.trim(), data.description ?? null, data.is_active ?? true]
    );
    return result.insertId;
  },

  async updateCategory(id, data) {
    const allowed = ['name', 'description', 'is_active'];
    const fields = allowed.filter((field) => data[field] !== undefined);
    const values = fields.map((field) => field === 'name' ? data[field].trim() : data[field]);
    const [result] = await db.execute(
      `UPDATE categories SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')}
       WHERE category_id = ?`,
      [...values, id]
    );
    return result.affectedRows;
  },

  async deleteCategory(id) {
    const [result] = await db.execute('DELETE FROM categories WHERE category_id = ?', [id]);
    return result.affectedRows;
  },
};
