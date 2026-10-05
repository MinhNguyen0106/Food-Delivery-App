const { randomBytes } = require('crypto');
const AppError = require('./AppError');
const { deliveryFeePerKm } = require('../config/env');
const model = require('../models/orderingModel');
const voucherModel = require('../models/voucherModel');
const voucherService = require('./voucherService');
const { toCents, fromCents } = require('../common/money');
const workflow = {
  confirm: { actor: 'RESTAURANT', from: 'PENDING', to: 'CONFIRMED' },
  reject: { actor: 'RESTAURANT', from: 'PENDING', to: 'REJECTED' },
  prepare: { actor: 'RESTAURANT', from: 'CONFIRMED', to: 'PREPARING' },
  ready: { actor: 'RESTAURANT', from: 'PREPARING', to: 'READY_FOR_PICKUP' },
  cancel: { actor: 'CUSTOMER', from: 'PENDING', to: 'CANCELLED' },
};

function requireCustomer(actor) {
  const customerId = Number(actor && actor.customerId);
  if (
    !actor ||
    actor.role !== 'CUSTOMER' ||
    !Number.isSafeInteger(customerId) ||
    customerId < 1
  ) {
    throw new AppError('Customer account is not available', 403, 'FORBIDDEN');
  }
  return customerId;
}

function positiveId(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new AppError(`${field} must be a positive integer`, 400, 'VALIDATION_ERROR');
  }
  return number;
}

function calculateDeliveryFee(restaurant, address) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(Number(address.latitude) - Number(restaurant.latitude));
  const longitudeDelta = radians(Number(address.longitude) - Number(restaurant.longitude));
  const latitude1 = radians(Number(restaurant.latitude));
  const latitude2 = radians(Number(address.latitude));
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) *
    Math.sin(longitudeDelta / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.round(distanceKm * deliveryFeePerKm);
}

function makeOrderCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `FD${date}${randomBytes(5).toString('hex').toUpperCase()}`;
}

function validateQuantity(value) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647) {
    throw new AppError('quantity must be a positive 32-bit integer', 400, 'VALIDATION_ERROR');
  }
  return quantity;
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

function requireAvailableFood(food) {
  if (!food) throw new AppError('Food not found', 404, 'NOT_FOUND');
  if (
    food.food_status !== 'AVAILABLE' ||
    food.restaurant_status !== 'ACTIVE' ||
    Number(food.category_active) !== 1
  ) {
    throw new AppError('Food is not currently available', 409, 'FOOD_UNAVAILABLE');
  }
}

async function readCart(customerId) {
  return transaction(async (connection) => {
    await model.ensureCart(connection, customerId);
    return model.getCart(customerId, connection);
  });
}

function verifySingleRestaurant(items, restaurantId) {
  if (!items.length) throw new AppError('Cart is empty', 409, 'EMPTY_CART');
  if (items.some((item) => Number(item.restaurant_id) !== Number(restaurantId))) {
    throw new AppError('Cart contains food from different restaurants', 409, 'CART_RESTAURANT_MISMATCH');
  }
  for (const item of items) requireAvailableFood(item);
}

async function getCheckoutContext(connection, customerId, addressId) {
  const cart = await model.lockCart(connection, customerId);
  if (!cart) throw new AppError('Cart is empty', 409, 'EMPTY_CART');
  const address = await model.getAddress(connection, addressId, customerId);
  if (!address) throw new AppError('Delivery address not found', 404, 'ADDRESS_NOT_FOUND');
  const items = await model.getCheckoutItems(connection, cart.cart_id);
  verifySingleRestaurant(items, cart.restaurant_id);
  const restaurant = await model.getRestaurantForCheckout(connection, cart.restaurant_id);
  if (!restaurant || restaurant.status !== 'ACTIVE') {
    throw new AppError('Restaurant is not active', 409, 'RESTAURANT_UNAVAILABLE');
  }
  if (Number(restaurant.is_open) !== 1) {
    throw new AppError('Restaurant is currently closed', 409, 'RESTAURANT_CLOSED');
  }
  const subtotalCents = items.reduce(
    (sum, item) => sum + toCents(item.price, 'Food price') * validateQuantity(item.quantity),
    0
  );
  const deliveryFeeAmount = fromCents(calculateDeliveryFee(restaurant, address) * 100);
  return { cart, address, items, restaurant, subtotalCents, deliveryFeeAmount };
}

module.exports = {
  async getCart(actor) {
    const customerId = requireCustomer(actor);
    return readCart(customerId);
  },

  async addCartItem(input, actor) {
    const customerId = requireCustomer(actor);
    const foodId = positiveId(input.food_id, 'food_id');
    const quantity = validateQuantity(input.quantity);
    await transaction(async (connection) => {
      const cart = await model.ensureCart(connection, customerId);
      const food = await model.getFoodForCart(connection, foodId);
      requireAvailableFood(food);
      if (cart.restaurant_id && Number(cart.restaurant_id) !== Number(food.restaurant_id)) {
        throw new AppError(
          'Cart already contains food from another restaurant; clear it before switching restaurants',
          409,
          'CART_RESTAURANT_MISMATCH'
        );
      }
      const existing = await model.getCartItem(connection, cart.cart_id, foodId);
      const totalQuantity = (existing ? Number(existing.quantity) : 0) + quantity;
      validateQuantity(totalQuantity);
      const priceCents = toCents(food.price, 'Food price');
      const subtotal = fromCents(priceCents * totalQuantity);
      if (!cart.restaurant_id) {
        await connection.execute(
          'UPDATE carts SET restaurant_id = ? WHERE cart_id = ?',
          [food.restaurant_id, cart.cart_id]
        );
      }
      if (existing) {
        await model.updateCartItem(
          connection, existing.cart_item_id, cart.cart_id,
          totalQuantity, fromCents(priceCents), subtotal
        );
      } else {
        await model.insertCartItem(
          connection, cart.cart_id, foodId, quantity,
          fromCents(priceCents), fromCents(priceCents * quantity)
        );
      }
    });
    return readCart(customerId);
  },

  async updateCartItem(itemIdValue, input, actor) {
    const customerId = requireCustomer(actor);
    const itemId = positiveId(itemIdValue, 'id');
    const quantity = validateQuantity(input.quantity);
    await transaction(async (connection) => {
      const cart = await model.lockCart(connection, customerId);
      if (!cart) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
      const [rows] = await connection.execute(
        'SELECT food_id FROM cart_items WHERE cart_item_id = ? AND cart_id = ? LIMIT 1 FOR UPDATE',
        [itemId, cart.cart_id]
      );
      if (!rows[0]) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
      const food = await model.getFoodForCart(connection, rows[0].food_id);
      requireAvailableFood(food);
      const priceCents = toCents(food.price, 'Food price');
      await model.updateCartItem(
        connection, itemId, cart.cart_id,
        quantity, fromCents(priceCents), fromCents(priceCents * quantity)
      );
    });
    return readCart(customerId);
  },

  async deleteCartItem(itemIdValue, actor) {
    const customerId = requireCustomer(actor);
    const itemId = positiveId(itemIdValue, 'id');
    await transaction(async (connection) => {
      const cart = await model.lockCart(connection, customerId);
      if (!cart) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
      const result = await model.deleteCartItem(connection, itemId, cart.cart_id);
      if (!result.affectedRows) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
      const [remaining] = await connection.execute(
        'SELECT COUNT(*) AS count FROM cart_items WHERE cart_id = ?',
        [cart.cart_id]
      );
      if (Number(remaining[0].count) === 0) {
        await connection.execute(
          'UPDATE carts SET restaurant_id = NULL WHERE cart_id = ?',
          [cart.cart_id]
        );
      }
    });
    return readCart(customerId);
  },

  async clearCart(actor) {
    const customerId = requireCustomer(actor);
    return transaction(async (connection) => {
      const cart = await model.lockCart(connection, customerId);
      if (cart) await model.clearCart(connection, cart.cart_id);
      return model.getCart(customerId, connection);
    });
  },

  async quoteCheckout(input, actor) {
    const customerId = requireCustomer(actor);
    const addressId = positiveId(input.address_id, 'address_id');
    return transaction(async (connection) => {
      const context = await getCheckoutContext(connection, customerId, addressId);
      const subtotal = fromCents(context.subtotalCents);
      const amountBeforeDiscountCents =
        context.subtotalCents + toCents(context.deliveryFeeAmount, 'Delivery fee');
      const voucher = input.voucher_code
        ? await voucherService.previewForCheckout(
          connection,
          input.voucher_code.trim(),
          context.subtotalCents,
          amountBeforeDiscountCents,
          customerId
        )
        : null;
      const discountCents = voucher ? voucher.discountCents : 0;
      const totalCents = amountBeforeDiscountCents - discountCents;
      return {
        subtotal,
        deliveryFee: context.deliveryFeeAmount,
        discount: fromCents(discountCents),
        totalAmount: fromCents(totalCents),
        paymentMethod: 'COD',
        voucherCode: voucher ? voucher.code : null,
      };
    });
  },

  async checkout(input, actor) {
    const customerId = requireCustomer(actor);
    const addressId = positiveId(input.address_id, 'address_id');
    return transaction(async (connection) => {
      const context = await getCheckoutContext(connection, customerId, addressId);
      const amountBeforeDiscountCents =
        context.subtotalCents + toCents(context.deliveryFeeAmount, 'Delivery fee');
      const voucher = input.voucher_code
        ? await voucherService.applyForCheckout(
          connection,
          input.voucher_code.trim(),
          context.subtotalCents,
          amountBeforeDiscountCents,
          customerId
        )
        : null;
      const discountCents = voucher ? voucher.discountCents : 0;
      const totalCents = amountBeforeDiscountCents - discountCents;
      const subtotal = fromCents(context.subtotalCents);
      const totalAmount = fromCents(totalCents);
      const deliveryFeeAmount = context.deliveryFeeAmount;
      const discountAmount = fromCents(discountCents);
      const orderStatusId = await model.getLookupId(
        connection, 'order_statuses', 'status_name', 'PENDING'
      );
      const paymentMethodId = await model.getLookupId(
        connection, 'payment_methods', 'method_name', 'COD'
      );
      const paymentStatusId = await model.getLookupId(
        connection, 'payment_statuses', 'status_name', 'PENDING'
      );
      if (!orderStatusId || !paymentMethodId || !paymentStatusId) {
        throw new AppError('Required order or COD lookup configuration is missing', 500, 'CONFIGURATION_ERROR');
      }
      const orderCode = makeOrderCode();
      const orderId = await model.createOrder(connection, {
        orderCode,
        customerId,
        restaurantId: context.restaurant.restaurant_id,
        addressId,
        voucherId: voucher ? voucher.voucherId : null,
        subtotal,
        deliveryFee: deliveryFeeAmount,
        discount: discountAmount,
        totalAmount,
        statusId: orderStatusId,
        note: input.note ?? context.address.note ?? null,
      });
      for (const item of context.items) {
        const unitPriceCents = toCents(item.price, 'Food price');
        await model.createOrderDetail(connection, orderId, {
          foodId: item.food_id,
          quantity: validateQuantity(item.quantity),
          unitPrice: fromCents(unitPriceCents),
          subtotal: fromCents(unitPriceCents * Number(item.quantity)),
        });
      }
      await model.createPayment(connection, orderId, paymentMethodId, paymentStatusId, totalAmount);
      await model.createDelivery(connection, orderId);
      await model.createOrderHistory(
        connection, orderId, orderStatusId, actor.userId, 'Customer created order'
      );
      await model.clearCart(connection, context.cart.cart_id);
      return {
        orderId,
        orderCode,
        subtotal,
        deliveryFee: deliveryFeeAmount,
        discount: discountAmount,
        totalAmount,
        paymentMethod: 'COD',
        voucherCode: voucher ? voucher.code : null,
      };
    });
  },

  async listOrders(actor, statusName) {
    if (actor && actor.role === 'CUSTOMER') {
      return model.listOrders(requireCustomer(actor), statusName);
    }
    if (
      actor &&
      actor.role === 'RESTAURANT' &&
      Number.isSafeInteger(Number(actor.restaurantId)) &&
      Number(actor.restaurantId) > 0
    ) {
      return model.listOrdersForRestaurant(Number(actor.restaurantId), statusName);
    }
    throw new AppError('You are not allowed to view these orders', 403, 'FORBIDDEN');
  },

  async getOrder(orderIdValue, actor) {
    const orderId = positiveId(orderIdValue, 'id');
    let order;
    if (actor && actor.role === 'CUSTOMER') {
      order = await model.getOrder(requireCustomer(actor), orderId);
    } else if (
      actor &&
      actor.role === 'RESTAURANT' &&
      Number.isSafeInteger(Number(actor.restaurantId)) &&
      Number(actor.restaurantId) > 0
    ) {
      order = await model.getOrderForRestaurant(Number(actor.restaurantId), orderId);
    } else {
      throw new AppError('You are not allowed to view this order', 403, 'FORBIDDEN');
    }
    if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
    return order;
  },

  async getOrderHistory(orderIdValue, actor) {
    const order = await this.getOrder(orderIdValue, actor);
    return order.history;
  },

  async transitionOrder(orderIdValue, action, note, actor) {
    const orderId = positiveId(orderIdValue, 'id');
    const transition = workflow[action];
    if (!transition) {
      throw new AppError('Order transition is not available', 400, 'INVALID_TRANSITION');
    }
    if (!actor || actor.role !== transition.actor) {
      throw new AppError('You are not allowed to perform this order transition', 403, 'FORBIDDEN');
    }
    const actorId = transition.actor === 'CUSTOMER'
      ? requireCustomer(actor)
      : Number(actor.restaurantId);
    if (transition.actor === 'RESTAURANT' && (!Number.isSafeInteger(actorId) || actorId < 1)) {
      throw new AppError('Restaurant account is not linked to a restaurant', 403, 'FORBIDDEN');
    }
    return transaction(async (connection) => {
      const order = await model.lockOrderForTransition(connection, orderId);
      if (
        !order ||
        (transition.actor === 'CUSTOMER' && Number(order.customer_id) !== actorId) ||
        (transition.actor === 'RESTAURANT' && Number(order.restaurant_id) !== actorId)
      ) {
        throw new AppError('Order not found', 404, 'NOT_FOUND');
      }
      if (order.status !== transition.from) {
        throw new AppError(
          `Order in ${order.status} cannot transition to ${transition.to}`,
          409,
          'INVALID_TRANSITION'
        );
      }
      const statusId = await model.getOrderStatusId(connection, transition.to);
      if (!statusId) {
        throw new AppError('Required order status configuration is missing', 500, 'CONFIGURATION_ERROR');
      }
      await model.updateOrderStatus(connection, orderId, statusId);
      if (transition.to === 'CANCELLED' || transition.to === 'REJECTED') {
        await model.cancelPendingDelivery(connection, orderId);
        if (order.voucher_id !== null && order.voucher_id !== undefined) {
          if (!(await voucherModel.restoreUsage(connection, order.voucher_id))) {
            throw new AppError(
              'Voucher usage could not be restored for the cancelled order',
              409,
              'VOUCHER_RESTORE_CONFLICT'
            );
          }
        }
      }
      await model.createOrderHistory(
        connection,
        orderId,
        statusId,
        actor.userId,
        note || `Order ${transition.to.toLowerCase().replace(/_/g, ' ')}`
      );
      return {
        orderId,
        previousStatus: order.status,
        status: transition.to,
      };
    });
  },
};
