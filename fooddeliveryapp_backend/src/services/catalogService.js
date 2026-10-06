const AppError = require('./AppError');
const model = require('../models/catalogModel');
const db = require('../common/db').promise();
const imageStorage = require('./imageStorageService');

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

function requireImageManager(entity, id, actor) {
  if (entity === 'restaurant') {
    if (actor?.role === 'ADMIN') return;
    if (
      actor?.role !== 'RESTAURANT' ||
      Number(actor.restaurantId) !== Number(id) ||
      !Number.isSafeInteger(Number(actor.userId))
    ) {
      throw new AppError('You cannot manage this Restaurant image', 403, 'FORBIDDEN');
    }
    return;
  }
  if (
    entity === 'food' &&
    actor?.role === 'RESTAURANT' &&
    Number.isSafeInteger(Number(actor.restaurantId)) &&
    Number(actor.restaurantId) > 0
  ) {
    return;
  }
  throw new AppError('You cannot manage this image', 403, 'FORBIDDEN');
}

async function deleteStoredImageSafely(imagePath, entity) {
  if (!imagePath) return;
  try {
    await imageStorage.deleteImage(imagePath, entity);
  } catch (error) {
    console.error('Old image cleanup failed', {
      entity,
      code: error.code || error.name,
    });
  }
}

async function removeNewImageSafely(imagePath, entity) {
  if (!imagePath) return;
  try {
    await imageStorage.deleteImage(imagePath, entity);
  } catch (error) {
    console.error('New image cleanup failed', {
      entity,
      code: error.code || error.name,
    });
  }
}

async function updateImage(entity, id, file, actor) {
  requireImageManager(entity, id, actor);
  imageStorage.validateImage(file);

  const initial = entity === 'restaurant'
    ? await model.getRestaurantImage(db, id)
    : await model.getFoodImage(db, id);
  if (!initial) {
    throw new AppError(`${entity === 'food' ? 'Food' : 'Restaurant'} not found`, 404, 'NOT_FOUND');
  }
  if (entity === 'restaurant') {
    requireImageManager(entity, id, actor);
    if (actor.role === 'RESTAURANT' && Number(initial.user_id) !== Number(actor.userId)) {
      throw new AppError('You cannot manage this Restaurant image', 403, 'FORBIDDEN');
    }
  } else if (Number(initial.restaurant_id) !== Number(actor.restaurantId)) {
    throw new AppError('Food not found', 404, 'NOT_FOUND');
  }

  const stored = await imageStorage.saveImage(`${entity}s`, file);
  let connection;
  let committed = false;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const current = entity === 'restaurant'
      ? await model.lockRestaurantImage(connection, id)
      : await model.lockFoodImage(connection, id);
    if (!current) {
      throw new AppError(`${entity === 'food' ? 'Food' : 'Restaurant'} not found`, 404, 'NOT_FOUND');
    }
    if (entity === 'restaurant') {
      if (actor.role === 'RESTAURANT' && Number(current.user_id) !== Number(actor.userId)) {
        throw new AppError('You cannot manage this Restaurant image', 403, 'FORBIDDEN');
      }
    } else if (Number(current.restaurant_id) !== Number(actor.restaurantId)) {
      throw new AppError('Food not found', 404, 'NOT_FOUND');
    }

    const affectedRows = entity === 'restaurant'
      ? await model.updateRestaurantImage(connection, id, stored.path)
      : await model.updateFoodImage(connection, id, actor.restaurantId, stored.path);
    if (affectedRows !== 1) {
      throw new AppError('Image could not be associated with the resource', 409, 'IMAGE_UPDATE_CONFLICT');
    }
    await connection.commit();
    committed = true;
    await deleteStoredImageSafely(current.image, `${entity}s`);
    return { image: stored.path };
  } catch (error) {
    if (!committed) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Image update rollback failed', {
            entity,
            code: rollbackError.code || rollbackError.name,
          });
        }
      }
      await removeNewImageSafely(stored.path, `${entity}s`);
    }
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function clearImage(entity, id, actor) {
  requireImageManager(entity, id, actor);
  return inTransaction(async (connection) => {
    const current = entity === 'restaurant'
      ? await model.lockRestaurantImage(connection, id)
      : await model.lockFoodImage(connection, id);
    if (!current) {
      throw new AppError(`${entity === 'food' ? 'Food' : 'Restaurant'} not found`, 404, 'NOT_FOUND');
    }
    if (entity === 'restaurant') {
      if (actor.role === 'RESTAURANT' && Number(current.user_id) !== Number(actor.userId)) {
        throw new AppError('You cannot manage this Restaurant image', 403, 'FORBIDDEN');
      }
    } else if (Number(current.restaurant_id) !== Number(actor.restaurantId)) {
      throw new AppError('Food not found', 404, 'NOT_FOUND');
    }

    if (current.image) {
      const affectedRows = entity === 'restaurant'
        ? await model.updateRestaurantImage(connection, id, null)
        : await model.updateFoodImage(connection, id, actor.restaurantId, null);
      if (affectedRows !== 1) {
        throw new AppError('Image could not be removed from the resource', 409, 'IMAGE_UPDATE_CONFLICT');
      }
    }
    return current.image || null;
  }).then(async (oldImage) => {
    await deleteStoredImageSafely(oldImage, `${entity}s`);
    return { image: null };
  });
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

  async getMyRestaurant(actor) {
    if (actor?.role !== 'RESTAURANT' ||
      !Number.isSafeInteger(Number(actor.restaurantId)) ||
      Number(actor.restaurantId) < 1) {
      throw new AppError('Restaurant account is not available', 403, 'FORBIDDEN');
    }
    return this.getRestaurant(actor.restaurantId, actor);
  },

  async updateMyRestaurant(actor, data) {
    if (actor?.role !== 'RESTAURANT' ||
      !Number.isSafeInteger(Number(actor.restaurantId)) ||
      Number(actor.restaurantId) < 1) {
      throw new AppError('Restaurant account is not available', 403, 'FORBIDDEN');
    }
    const current = await this.getRestaurant(actor.restaurantId, actor);
    await model.updateRestaurantProfile(actor.restaurantId, actor.userId, data);
    return this.getRestaurant(current.restaurant_id, actor);
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

  uploadRestaurantImage(id, file, actor) {
    return updateImage('restaurant', id, file, actor);
  },

  deleteRestaurantImage(id, actor) {
    return clearImage('restaurant', id, actor);
  },

  uploadFoodImage(id, file, actor) {
    return updateImage('food', id, file, actor);
  },

  deleteFoodImage(id, actor) {
    return clearImage('food', id, actor);
  },
};
