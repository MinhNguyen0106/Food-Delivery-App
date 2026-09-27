const AppError = require('./AppError');
const model = require('../models/catalogModel');
const db = require('../common/db').promise();

function databaseError(error) {
  if (error.code === 'ER_DUP_ENTRY') {
    return new AppError('A record with the same unique value already exists', 409, 'CONFLICT');
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError('The record is in use and cannot be deleted', 409, 'RECORD_IN_USE');
  }
  return error;
}

function parseStatus(statusId, status) {
  if (!status) {
    throw new AppError('Food status was not found', 400, 'VALIDATION_ERROR');
  }
  if (!['AVAILABLE', 'UNAVAILABLE'].includes(status.status_name)) {
    throw new AppError('Food status must be AVAILABLE or UNAVAILABLE', 400, 'VALIDATION_ERROR');
  }
  return statusId;
}

async function inTransaction(work) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listRestaurants(filter, actor) {
    return model.listRestaurants(filter, actor);
  },

  async getRestaurant(id, actor) {
    const restaurant = await model.getRestaurantById(id, actor);
    if (!restaurant) throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
    return restaurant;
  },

  async listRestaurantCategories(id, actor) {
    if (!(await model.restaurantIsVisible(id, actor))) {
      throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
    }
    return model.listRestaurantCategories(id);
  },

  listCategories(actor) {
    return model.listCategories(actor);
  },

  async getCategory(id, actor) {
    const category = await model.getCategoryById(id, actor);
    if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');
    return category;
  },

  async createCategory(data) {
    try {
      return await model.createCategory(data);
    } catch (error) {
      throw databaseError(error);
    }
  },

  async updateCategory(id, data) {
    try {
      const affectedRows = await model.updateCategory(id, data);
      if (affectedRows === 0 && !(await model.getCategoryById(id, { role: 'ADMIN' }))) {
        throw new AppError('Category not found', 404, 'NOT_FOUND');
      }
    } catch (error) {
      throw databaseError(error);
    }
  },

  async deleteCategory(id) {
    try {
      if (!(await model.deleteCategory(id))) {
        throw new AppError('Category not found', 404, 'NOT_FOUND');
      }
    } catch (error) {
      throw databaseError(error);
    }
  },

  listFoods(filter, actor) {
    return model.listFoods(filter, actor);
  },

  async getFood(id, actor) {
    const food = await model.getFoodById(id, actor);
    if (!food) throw new AppError('Food not found', 404, 'NOT_FOUND');
    return food;
  },

  async createFood(data, actor) {
    if (!actor.restaurantId) {
      throw new AppError('Restaurant account is not linked to a restaurant', 403, 'FORBIDDEN');
    }
    try {
      return await inTransaction(async (connection) => {
        if (!(await model.getActiveCategory(data.category_id, connection))) {
          throw new AppError('Category does not exist or is inactive', 400, 'INVALID_CATEGORY');
        }
        const statusId = data.status_id === undefined
          ? await model.getFoodStatusId('AVAILABLE', connection)
          : data.status_id;
        parseStatus(statusId, await model.getFoodStatus(statusId, connection));
        return model.createFood(
          { ...data, restaurantId: actor.restaurantId, statusId },
          connection
        );
      });
    } catch (error) {
      throw databaseError(error);
    }
  },

  async updateFood(id, data, actor) {
    if (!actor.restaurantId) {
      throw new AppError('Restaurant account is not linked to a restaurant', 403, 'FORBIDDEN');
    }
    const current = await model.getFoodById(id, actor);
    if (!current) throw new AppError('Food not found', 404, 'NOT_FOUND');
    try {
      await inTransaction(async (connection) => {
        if (data.category_id !== undefined && !(await model.getActiveCategory(data.category_id, connection))) {
          throw new AppError('Category does not exist or is inactive', 400, 'INVALID_CATEGORY');
        }
        if (data.status_id !== undefined) {
          parseStatus(data.status_id, await model.getFoodStatus(data.status_id, connection));
        }
        await model.updateFood(id, actor.restaurantId, data, connection);
      });
    } catch (error) {
      throw databaseError(error);
    }
  },

  async deleteFood(id, actor) {
    if (!actor.restaurantId) {
      throw new AppError('Restaurant account is not linked to a restaurant', 403, 'FORBIDDEN');
    }
    try {
      const affectedRows = await model.deleteFood(id, actor.restaurantId);
      if (!affectedRows) throw new AppError('Food not found', 404, 'NOT_FOUND');
    } catch (error) {
      throw databaseError(error);
    }
  },
};
