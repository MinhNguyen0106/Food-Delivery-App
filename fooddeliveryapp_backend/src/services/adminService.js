const AppError = require('./AppError');
const model = require('../models/adminModel');

function requireAdmin(actor) {
  if (!actor || actor.role !== 'ADMIN') {
    throw new AppError('Administrator access is required', 403, 'FORBIDDEN');
  }
}

function positiveId(value, field) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw new AppError(`${field} must be a positive 32-bit integer`, 400, 'VALIDATION_ERROR');
  }
  return id;
}

async function statusId(connection, table, status) {
  const allowed = {
    user_statuses: ['ACTIVE', 'LOCKED'],
    restaurant_statuses: ['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED'],
  };
  if (!allowed[table] || !allowed[table].includes(status)) {
    throw new AppError('Requested status is not supported', 400, 'VALIDATION_ERROR');
  }
  const [rows] = await connection.execute(
    `SELECT status_id FROM ${table} WHERE status_name = ? LIMIT 1`,
    [status]
  );
  if (!rows[0]) throw new AppError('Status configuration is missing', 500, 'CONFIGURATION_ERROR');
  return rows[0].status_id;
}

async function setAccountStatus(resource, idValue, status, actor) {
  requireAdmin(actor);
  const id = positiveId(idValue, `${resource}_id`);
  const connection = await model.pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      resource === 'customer'
        ? `SELECT usr.user_id, user_status.status_name AS status
           FROM customers entity
           JOIN users usr ON usr.user_id = entity.user_id
           JOIN user_statuses user_status ON user_status.status_id = usr.status_id
           WHERE entity.customer_id = ?
           LIMIT 1 FOR UPDATE`
        : `SELECT usr.user_id, user_status.status_name AS status
           FROM shippers entity
           JOIN users usr ON usr.user_id = entity.user_id
           JOIN user_statuses user_status ON user_status.status_id = usr.status_id
           WHERE entity.shipper_id = ?
           LIMIT 1 FOR UPDATE`,
      [id]
    );
    if (!rows[0]) throw new AppError(`${resource} not found`, 404, 'NOT_FOUND');
    if (
      resource === 'shipper' &&
      status === 'LOCKED' &&
      rows[0].status === 'ACTIVE' &&
      await model.shipperHasActiveDelivery(connection, id)
    ) {
      throw new AppError(
        'A Shipper with an active delivery cannot be locked',
        409,
        'SHIPPER_HAS_ACTIVE_DELIVERY'
      );
    }
    const nextStatusId = await statusId(connection, 'user_statuses', status);
    if (rows[0].status !== status) {
      const update = resource === 'customer'
        ? model.updateCustomerAccountStatus
        : model.updateShipperAccountStatus;
      await update.call(model, connection, id, nextStatusId);
    }
    await connection.commit();
    return { id, accountStatus: status };
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

module.exports = {
  async listCustomers(filter, actor) {
    requireAdmin(actor);
    return model.listCustomers(filter);
  },
  async getCustomer(id, actor) {
    requireAdmin(actor);
    const customer = await model.getCustomer(positiveId(id, 'customer_id'));
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
    return customer;
  },
  setCustomerStatus(id, status, actor) {
    return setAccountStatus('customer', id, status, actor);
  },
  async listRestaurants(filter, actor) {
    requireAdmin(actor);
    return model.listRestaurants(filter);
  },
  async getRestaurant(idValue, actor) {
    requireAdmin(actor);
    const restaurant = await model.getRestaurant(positiveId(idValue, 'restaurant_id'));
    if (!restaurant) throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
    return restaurant;
  },
  async updateRestaurantStatus(idValue, status, actor) {
    requireAdmin(actor);
    const restaurantId = positiveId(idValue, 'restaurant_id');
    const connection = await model.pool.getConnection();
    try {
      await connection.beginTransaction();
      const restaurant = await model.lockRestaurant(connection, restaurantId);
      if (!restaurant) throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
      const allowedTransitions = {
        PENDING: ['ACTIVE', 'REJECTED'],
        ACTIVE: ['SUSPENDED'],
        SUSPENDED: ['ACTIVE'],
        REJECTED: [],
      };
      if (!allowedTransitions[restaurant.status].includes(status)) {
        throw new AppError(
          `Restaurant cannot transition from ${restaurant.status} to ${status}`,
          409,
          'INVALID_TRANSITION'
        );
      }
      const nextStatusId = await statusId(connection, 'restaurant_statuses', status);
      await model.setRestaurantStatus(connection, restaurantId, nextStatusId);
      await connection.commit();
      return { restaurantId, previousStatus: restaurant.status, status };
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
  async listShippers(filter, actor) {
    requireAdmin(actor);
    return model.listShippers(filter);
  },
  async getShipper(idValue, actor) {
    requireAdmin(actor);
    const shipper = await model.getShipper(positiveId(idValue, 'shipper_id'));
    if (!shipper) throw new AppError('Shipper not found', 404, 'NOT_FOUND');
    return shipper;
  },
  setShipperStatus(id, status, actor) {
    return setAccountStatus('shipper', id, status, actor);
  },
  async listOrders(filter, actor) {
    requireAdmin(actor);
    return model.listAdminOrders(filter);
  },
  async getOrder(idValue, actor) {
    requireAdmin(actor);
    const order = await model.getAdminOrder(model.pool, positiveId(idValue, 'order_id'));
    if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
    return order;
  },
};
