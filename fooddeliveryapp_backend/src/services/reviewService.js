const AppError = require('./AppError');
const model = require('../models/reviewModel');

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw new AppError(`${field} must be a positive 32-bit integer`, 400, 'VALIDATION_ERROR');
  }
  return id;
}

function requireRole(actor, role) {
  if (!actor || actor.role !== role) {
    throw new AppError('You are not allowed to access these Reviews', 403, 'FORBIDDEN');
  }
}

async function transaction(work) {
  const connection = await model.pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Database transaction rollback failed', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

function duplicateReview(error) {
  if (error && error.code === 'ER_DUP_ENTRY') {
    throw new AppError('This Order already has a Review', 409, 'REVIEW_ALREADY_EXISTS');
  }
  throw error;
}

module.exports = {
  async create(input, actor) {
    requireRole(actor, 'CUSTOMER');
    const customerId = positiveId(actor.customerId, 'customer_id');
    const orderId = positiveId(input.order_id, 'order_id');
    return transaction(async (connection) => {
      const order = await model.lockCustomerOrder(connection, orderId, customerId);
      if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
      if (order.status !== 'COMPLETED') {
        throw new AppError('Only a completed Order can be reviewed', 409, 'ORDER_NOT_COMPLETED');
      }
      try {
        const reviewId = await model.create(connection, {
          customerId,
          orderId,
          rating: input.rating,
          comment: input.comment ?? null,
        });
        if (!reviewId) {
          throw new AppError('Visible review status is not configured', 500, 'CONFIGURATION_ERROR');
        }
        return { reviewId, orderId, status: 'VISIBLE' };
      } catch (error) {
        return duplicateReview(error);
      }
    });
  },

  async listMine(actor) {
    requireRole(actor, 'CUSTOMER');
    return model.listCustomer(positiveId(actor.customerId, 'customer_id'));
  },

  async listAdmin(statusName, actor) {
    requireRole(actor, 'ADMIN');
    return model.listAdmin(statusName);
  },

  async listRestaurant(actor) {
    requireRole(actor, 'RESTAURANT');
    return model.listRestaurant(positiveId(actor.restaurantId, 'restaurant_id'));
  },

  async listPublicRestaurant(restaurantIdValue, actor) {
    requireRole(actor, 'CUSTOMER');
    return model.listPublicRestaurant(positiveId(restaurantIdValue, 'restaurant_id'));
  },

  async get(reviewIdValue, actor) {
    const reviewId = positiveId(reviewIdValue, 'review_id');
    const review = await model.get(model.pool, reviewId);
    if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
    if (actor && actor.role === 'ADMIN') return review;
    if (
      actor && actor.role === 'CUSTOMER' &&
      Number(review.customer_id) === Number(actor.customerId)
    ) {
      return review;
    }
    if (
      actor && actor.role === 'RESTAURANT' &&
      Number(review.restaurant_id) === Number(actor.restaurantId) &&
      review.status === 'VISIBLE'
    ) {
      const restaurantReview = { ...review };
      delete restaurantReview.customer_id;
      return restaurantReview;
    }
    throw new AppError('Review not found', 404, 'NOT_FOUND');
  },

  async moderate(reviewIdValue, statusName, actor) {
    requireRole(actor, 'ADMIN');
    const reviewId = positiveId(reviewIdValue, 'review_id');
    const connection = await model.pool.getConnection();
    try {
      await connection.beginTransaction();
      const current = await model.get(connection, reviewId, true);
      if (!current) throw new AppError('Review not found', 404, 'NOT_FOUND');
      const statusId = await model.statusId(connection, statusName);
      if (!statusId) {
        throw new AppError('Review status configuration is missing', 500, 'CONFIGURATION_ERROR');
      }
      await model.updateStatus(connection, reviewId, statusId);
      await connection.commit();
      return { reviewId, previousStatus: current.status, status: statusName };
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Database transaction rollback failed', rollbackError);
      }
      throw error;
    } finally {
      connection.release();
    }
  },
};
