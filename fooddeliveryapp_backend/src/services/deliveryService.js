const AppError = require('./AppError');
const model = require('../models/deliveryModel');

const transitions = {
  pickup: {
    deliveryFrom: 'ACCEPTED',
    deliveryTo: 'PICKED_UP',
    orderFrom: 'READY_FOR_PICKUP',
    orderTo: 'PICKED_UP',
    timestamp: 'pickup_time',
    historyNote: 'Shipper picked up the order',
  },
  start: {
    deliveryFrom: 'PICKED_UP',
    deliveryTo: 'DELIVERING',
    orderFrom: 'PICKED_UP',
    orderTo: 'DELIVERING',
    timestamp: null,
    historyNote: 'Shipper started delivery',
  },
  complete: {
    deliveryFrom: 'DELIVERING',
    deliveryTo: 'COMPLETED',
    orderFrom: 'DELIVERING',
    orderTo: 'COMPLETED',
    timestamp: 'delivery_time',
    historyNote: 'Shipper completed delivery and collected COD',
  },
};

function positiveId(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647) {
    throw new AppError(`${field} must be a positive 32-bit integer`, 400, 'VALIDATION_ERROR');
  }
  return number;
}

function requireShipper(actor) {
  const shipperId = Number(actor && actor.shipperId);
  if (
    !actor ||
    actor.role !== 'SHIPPER' ||
    !Number.isSafeInteger(shipperId) ||
    shipperId < 1
  ) {
    throw new AppError('Shipper account is not available', 403, 'FORBIDDEN');
  }
  return shipperId;
}

function amountInCents(value) {
  const match = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0') || 0);
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

async function requireShipperRow(connection, shipperId, lock = false) {
  const shipper = await model.getShipper(connection, shipperId, lock);
  if (!shipper) throw new AppError('Shipper account is not available', 403, 'FORBIDDEN');
  return shipper;
}

async function transitionOrderAndDelivery(connection, delivery, order, shipper, transition) {
  if (delivery.status !== transition.deliveryFrom || order.status !== transition.orderFrom) {
    throw new AppError(
      `Delivery ${delivery.status} and Order ${order.status} cannot perform this action`,
      409,
      'INVALID_TRANSITION'
    );
  }
  const deliveryUpdated = await model.updateDeliveryStatus(
    connection,
    delivery.delivery_id,
    transition.deliveryFrom,
    transition.deliveryTo,
    transition.timestamp
  );
  const orderUpdated = await model.updateOrderStatus(
    connection,
    order.order_id,
    transition.orderFrom,
    transition.orderTo
  );
  if (!deliveryUpdated || !orderUpdated) {
    throw new AppError('Delivery state changed; retry the operation', 409, 'INVALID_TRANSITION');
  }
  const historyInserted = await model.addOrderHistory(
    connection,
    order.order_id,
    transition.orderTo,
    shipper.user_id,
    transition.historyNote
  );
  if (!historyInserted) {
    throw new AppError('Order status history could not be recorded', 500, 'HISTORY_WRITE_FAILED');
  }
  return {
    deliveryId: delivery.delivery_id,
    orderId: order.order_id,
    previousDeliveryStatus: transition.deliveryFrom,
    deliveryStatus: transition.deliveryTo,
    previousOrderStatus: transition.orderFrom,
    orderStatus: transition.orderTo,
  };
}

module.exports = {
  async setAvailability(statusName, actor) {
    const shipperId = requireShipper(actor);
    if (!['ONLINE', 'OFFLINE'].includes(statusName)) {
      throw new AppError('Shipper availability must be ONLINE or OFFLINE', 400, 'VALIDATION_ERROR');
    }
    return transaction(async (connection) => {
      const shipper = await requireShipperRow(connection, shipperId, true);
      const activeDelivery = await model.hasActiveDelivery(connection, shipperId);
      if (activeDelivery || shipper.status === 'BUSY') {
        throw new AppError('A Shipper with an active delivery cannot change availability', 409, 'SHIPPER_BUSY');
      }
      const statusId = await model.getLookupId(
        connection, 'shipper_statuses', 'status_name', statusName
      );
      if (!statusId) {
        throw new AppError('Required Shipper status configuration is missing', 500, 'CONFIGURATION_ERROR');
      }
      await model.updateShipperStatus(connection, shipperId, statusId);
      return { status: statusName };
    });
  },

  async listAvailable(actor) {
    const shipperId = requireShipper(actor);
    const shipper = await requireShipperRow(model.pool, shipperId);
    if (!['ONLINE', 'BUSY'].includes(shipper.status)) {
      throw new AppError('Shipper must be ONLINE or BUSY to view available deliveries', 409, 'SHIPPER_NOT_ONLINE');
    }
    return model.listAvailableDeliveries(model.pool);
  },

  async listMine(actor) {
    const shipperId = requireShipper(actor);
    return model.listShipperDeliveries(model.pool, shipperId);
  },

  async listHistory(actor) {
    const shipperId = requireShipper(actor);
    return model.listShipperDeliveryHistory(model.pool, shipperId);
  },

  async getMine(deliveryIdValue, actor) {
    const shipperId = requireShipper(actor);
    const deliveryId = positiveId(deliveryIdValue, 'delivery_id');
    const delivery = await model.getShipperDelivery(model.pool, shipperId, deliveryId);
    if (!delivery) throw new AppError('Delivery not found', 404, 'NOT_FOUND');
    return delivery;
  },

  async accept(deliveryIdValue, actor) {
    const shipperId = requireShipper(actor);
    const deliveryId = positiveId(deliveryIdValue, 'delivery_id');
    return transaction(async (connection) => {
      const shipper = await requireShipperRow(connection, shipperId, true);
      if (!['ONLINE', 'BUSY'].includes(shipper.status)) {
        throw new AppError('Only an ONLINE or BUSY Shipper can accept a delivery', 409, 'SHIPPER_NOT_ONLINE');
      }
      const delivery = await model.lockDelivery(connection, deliveryId);
      if (!delivery || delivery.status !== 'REQUESTED' || delivery.shipper_id !== null) {
        throw new AppError('Delivery is no longer available', 409, 'DELIVERY_UNAVAILABLE');
      }
      const order = await model.lockOrder(connection, delivery.order_id);
      if (!order || order.status !== 'READY_FOR_PICKUP') {
        throw new AppError('Delivery requires an Order that is ready for pickup', 409, 'INVALID_TRANSITION');
      }
      const accepted = await model.updateDeliveryAssignment(connection, deliveryId, shipperId);
      const busyId = await model.getLookupId(connection, 'shipper_statuses', 'status_name', 'BUSY');
      if (!accepted || !busyId) {
        throw new AppError('Delivery could not be assigned', 409, 'DELIVERY_UNAVAILABLE');
      }
      await model.updateShipperStatus(connection, shipperId, busyId);
      return {
        deliveryId,
        orderId: order.order_id,
        deliveryStatus: 'ACCEPTED',
        shipperStatus: 'BUSY',
      };
    });
  },

  async advance(deliveryIdValue, action, actor) {
    const shipperId = requireShipper(actor);
    const deliveryId = positiveId(deliveryIdValue, 'delivery_id');
    const transition = transitions[action];
    if (!transition) {
      throw new AppError('Delivery action is not available', 400, 'INVALID_TRANSITION');
    }
    return transaction(async (connection) => {
      const shipper = await requireShipperRow(connection, shipperId, true);
      const delivery = await model.lockDelivery(connection, deliveryId);
      if (!delivery || Number(delivery.shipper_id) !== shipperId) {
        throw new AppError('Delivery not found', 404, 'NOT_FOUND');
      }
      if (shipper.status !== 'BUSY') {
        throw new AppError('Shipper must be BUSY with an active delivery', 409, 'SHIPPER_NOT_BUSY');
      }
      const order = await model.lockOrder(connection, delivery.order_id);
      if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
      const result = await transitionOrderAndDelivery(
        connection, delivery, order, shipper, transition
      );
      if (action === 'complete') {
        const payment = await model.lockCodPayment(connection, order.order_id);
        const totalAmountCents = amountInCents(order.total_amount);
        let paymentError = null;
        if (payment && payment.method !== 'COD') {
          paymentError = `Order payment method is ${payment.method}, not COD`;
        } else if (payment && payment.status !== 'PENDING') {
          paymentError = `COD payment status is ${payment.status}, not PENDING`;
        } else if (totalAmountCents === null) {
          paymentError = 'Order total amount is invalid';
        }
        if (paymentError) {
          throw new AppError(
            paymentError,
            409,
            'COD_PAYMENT_INVALID'
          );
        }
        if (!payment) {
          console.warn(
            `Creating missing COD payment for completed order ${order.order_id}`
          );
          const created = await model.createPaidCodPayment(
            connection,
            order.order_id,
            order.total_amount
          );
          if (!created) {
            throw new AppError(
              'Missing COD payment could not be recorded',
              409,
              'COD_PAYMENT_INVALID'
            );
          }
        } else {
          if (amountInCents(payment.amount) !== totalAmountCents) {
            console.warn(
              `Correcting COD payment amount to the order total for order ${order.order_id}`
            );
          }
          const paid = await model.markCodPaid(
            connection,
            order.order_id,
            order.total_amount
          );
          if (!paid) {
            throw new AppError('COD payment could not be confirmed', 409, 'COD_PAYMENT_INVALID');
          }
        }
        const stillHasActiveDelivery = await model.hasActiveDelivery(connection, shipperId);
        if (!stillHasActiveDelivery) {
          const onlineId = await model.getLookupId(
            connection, 'shipper_statuses', 'status_name', 'ONLINE'
          );
          if (!onlineId) {
            throw new AppError('Shipper availability configuration is missing', 500, 'CONFIGURATION_ERROR');
          }
          await model.updateShipperStatus(connection, shipperId, onlineId);
        }
        result.shipperStatus = stillHasActiveDelivery ? 'BUSY' : 'ONLINE';
        result.payment = { method: 'COD', status: 'PAID', amount: String(order.total_amount) };
      }
      return result;
    });
  },

  async trackOrder(orderIdValue, actor) {
    if (!actor || !['CUSTOMER', 'RESTAURANT', 'SHIPPER'].includes(actor.role)) {
      throw new AppError('You are not allowed to view this delivery', 403, 'FORBIDDEN');
    }
    const orderId = positiveId(orderIdValue, 'order_id');
    const tracking = await model.getOrderTracking(model.pool, orderId, actor);
    if (!tracking) throw new AppError('Delivery not found', 404, 'NOT_FOUND');
    return tracking;
  },
};
