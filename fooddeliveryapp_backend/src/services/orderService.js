const { randomBytes } = require('crypto');
const AppError = require('./AppError');
const {
  deliveryFeePerKm,
} = require('../config/env');
const model = require('../models/orderingModel');
const voucherModel = require('../models/voucherModel');
const voucherService = require('./voucherService');
const { toCents, fromCents } = require('../common/money');
const routingService = require('./routingService');
const deliveryEstimateService = require('./deliveryEstimateService');
const SCHEDULED_DELIVERY_ERROR =
  'Khoảng cách quá xa hoặc thời gian quá gấp, không thể đảm bảo giao đúng giờ.';
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

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647) {
    throw new AppError(`${field} must be a positive 32-bit integer`, 400, 'VALIDATION_ERROR');
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

async function transaction(work, isolationLevel) {
  const connection = await model.pool.getConnection();
  try {
    if (isolationLevel === 'READ COMMITTED') {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    }
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

async function getCheckoutContext(connection, customerId, addressId, allowClosed = false) {
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
  if (!allowClosed && Number(restaurant.is_open) !== 1) {
    throw new AppError('Restaurant is currently closed', 409, 'RESTAURANT_CLOSED');
  }
  const subtotalCents = items.reduce(
    (sum, item) => sum + toCents(item.price, 'Food price') * validateQuantity(item.quantity),
    0
  );
  const deliveryFeeAmount = fromCents(calculateDeliveryFee(restaurant, address) * 100);
  return { cart, address, items, restaurant, subtotalCents, deliveryFeeAmount };
}

async function createOrderFromContext(connection, context, input, actor, scheduled = null) {
  const customerId = requireCustomer(actor);
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
  const discountAmount = fromCents(discountCents);
  const orderStatusId = await model.getLookupId(
    connection, 'order_statuses', 'status_name', scheduled ? 'SCHEDULED' : 'PENDING'
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
  const orderInput = {
    orderCode,
    customerId,
    restaurantId: context.restaurant.restaurant_id,
    addressId: context.address.address_id,
    voucherId: voucher ? voucher.voucherId : null,
    subtotal,
    deliveryFee: context.deliveryFeeAmount,
    discount: discountAmount,
    totalAmount,
    statusId: orderStatusId,
    note: input.note ?? context.address.note ?? null,
  };
  const orderId = scheduled
    ? await model.createScheduledOrder(connection, {
      ...orderInput,
      scheduledFor: scheduled.scheduledFor,
      scheduledSlotEnd: scheduled.scheduledSlotEnd,
      scheduledTriggerAt: scheduled.scheduledTriggerAt,
      scheduledDispatchAt: scheduled.scheduledDispatchAt,
      prepMinutes: scheduled.prepMinutes,
      bufferMinutes: scheduled.bufferMinutes,
      travelSeconds: scheduled.travelSeconds,
      distanceMeters: scheduled.distanceMeters,
    })
    : await model.createOrder(connection, orderInput);

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
  if (!scheduled) await model.createDelivery(connection, orderId);
  await model.createOrderHistory(
    connection,
    orderId,
    orderStatusId,
    actor.userId,
    scheduled ? 'Customer created scheduled order' : 'Customer created order'
  );
  await model.clearCart(connection, context.cart.cart_id);
  return {
    orderId,
    orderCode,
    subtotal,
    deliveryFee: context.deliveryFeeAmount,
    discount: discountAmount,
    totalAmount,
    paymentMethod: 'COD',
    voucherCode: voucher ? voucher.code : null,
    ...(scheduled ? {
      status: 'SCHEDULED',
      scheduledFor: scheduled.scheduledFor,
      scheduledSlotEnd: scheduled.scheduledSlotEnd,
      scheduledTriggerAt: scheduled.scheduledTriggerAt,
      scheduledDispatchAt: scheduled.scheduledDispatchAt,
      travelMinutes: Math.ceil(scheduled.travelSeconds / 60),
    } : {}),
  };
}

function validateScheduleDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('date must use YYYY-MM-DD format', 400, 'VALIDATION_ERROR');
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new AppError('date must be a valid calendar date', 400, 'VALIDATION_ERROR');
  }
  return value;
}

async function getRouteEstimate(context) {
  const route = await routingService.getDrivingEstimate(
    context.restaurant,
    context.address
  );
  deliveryEstimateService.assertWithinDeliveryRange(route.distanceMeters);
  return {
    ...route,
    travelSeconds: deliveryEstimateService.calculateTravelSeconds(route.distanceMeters),
    averageSpeedKmh: deliveryEstimateService.averageSpeedKmh,
  };
}

async function querySlots(connection, context, date, route) {
  const [rows] = await connection.execute(
    `SELECT slot.slot_id, slot.start_time, slot.end_time,
        COALESCE(capacity.capacity, 4) AS capacity,
        COALESCE(capacity.prep_minutes, 20) AS prep_minutes,
        COALESCE(capacity.buffer_minutes, 5) AS buffer_minutes,
        (
          SELECT COUNT(*)
          FROM orders scheduled_order
          JOIN order_statuses scheduled_status
            ON scheduled_status.status_id = scheduled_order.status_id
          WHERE scheduled_order.restaurant_id = restaurant.restaurant_id
            AND scheduled_order.scheduled_for = TIMESTAMP(?, slot.start_time)
            AND scheduled_status.status_name NOT IN ('CANCELLED', 'REJECTED')
        ) AS booked,
        TIMESTAMPDIFF(
          SECOND, CURRENT_TIMESTAMP, TIMESTAMP(?, slot.start_time)
        ) AS lead_seconds,
        TIMESTAMPDIFF(
          SECOND,
          CASE
            WHEN restaurant.opening_time <= restaurant.closing_time
              THEN TIMESTAMP(?, restaurant.opening_time)
            WHEN slot.start_time >= restaurant.opening_time
              THEN TIMESTAMP(?, restaurant.opening_time)
            ELSE TIMESTAMP(
              DATE_SUB(?, INTERVAL 1 DAY), restaurant.opening_time
            )
          END,
          DATE_SUB(
            TIMESTAMP(?, slot.start_time),
            INTERVAL (
              COALESCE(capacity.prep_minutes, 20) * 60 + ? +
              COALESCE(capacity.buffer_minutes, 5) * 60
            ) SECOND
          )
        ) AS trigger_after_open_seconds
     FROM time_slots slot
     JOIN restaurants restaurant ON restaurant.restaurant_id = ?
     LEFT JOIN restaurant_capacities capacity
       ON capacity.restaurant_id = restaurant.restaurant_id
      AND capacity.slot_id = slot.slot_id
     WHERE restaurant.opening_time IS NOT NULL
       AND restaurant.closing_time IS NOT NULL
       AND (
         (
           restaurant.opening_time <= restaurant.closing_time
           AND slot.start_time >= restaurant.opening_time
           AND slot.end_time <= restaurant.closing_time
         )
         OR (
           restaurant.opening_time > restaurant.closing_time
           AND (
             slot.start_time >= restaurant.opening_time
             OR slot.end_time <= restaurant.closing_time
           )
         )
       )
     ORDER BY slot.start_time`,
    [date, date, date, date, date, date, route.travelSeconds,
      context.restaurant.restaurant_id]
  );

  return rows.flatMap((row) => {
    const prepMinutes = Number(row.prep_minutes);
    const bufferMinutes = Number(row.buffer_minutes);
    const requiredSeconds = prepMinutes * 60 + route.travelSeconds + bufferMinutes * 60;
    if (
      Number(row.booked) >= Number(row.capacity) ||
      Number(row.lead_seconds) < requiredSeconds ||
      Number(row.trigger_after_open_seconds) < 0
    ) {
      return [];
    }
    const endDate = row.end_time === '24:00:00'
      ? addDays(date, 1)
      : date;
    const endTime = row.end_time === '24:00:00' ? '00:00:00' : row.end_time;
    return [{
      slotId: Number(row.slot_id),
      start: `${date} ${row.start_time}`,
      end: `${endDate} ${endTime}`,
      capacity: Number(row.capacity),
      booked: Number(row.booked),
      prepMinutes,
      bufferMinutes,
      travelMinutes: Math.ceil(route.travelSeconds / 60),
      distanceMeters: route.distanceMeters,
      requiredLeadMinutes: Math.ceil(requiredSeconds / 60),
      requiredLeadSeconds: requiredSeconds,
    }];
  });
}

function addDays(dateValue, dayCount) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + dayCount));
  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, '0'),
    String(result.getUTCDate()).padStart(2, '0'),
  ].join('-');
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
      return createOrderFromContext(connection, context, input, actor);
    });
  },

  async availableScheduledSlots(input, actor) {
    const customerId = requireCustomer(actor);
    const addressId = positiveId(input.address_id, 'address_id');
    const date = validateScheduleDate(input.date);
    const context = await transaction((connection) =>
      getCheckoutContext(connection, customerId, addressId, true)
    );
    const route = await getRouteEstimate(context);
    const slots = await querySlots(model.pool, context, date, route);
    return {
      date,
      distanceMeters: route.distanceMeters,
      travelMinutes: Math.ceil(route.travelSeconds / 60),
      averageSpeedKmh: route.averageSpeedKmh,
      slots,
    };
  },

  async scheduleOrder(input, actor) {
    const customerId = requireCustomer(actor);
    const addressId = positiveId(input.address_id, 'address_id');
    const slotId = positiveId(input.slot_id, 'slot_id');
    const date = validateScheduleDate(input.date);
    const initialContext = await transaction((connection) =>
      getCheckoutContext(connection, customerId, addressId, true)
    );
    const route = await getRouteEstimate(initialContext);

    return transaction(async (connection) => {
      const context = await getCheckoutContext(connection, customerId, addressId, true);
      if (
        Number(context.restaurant.restaurant_id) !== Number(initialContext.restaurant.restaurant_id) ||
        Number(context.restaurant.latitude) !== Number(initialContext.restaurant.latitude) ||
        Number(context.restaurant.longitude) !== Number(initialContext.restaurant.longitude) ||
        Number(context.address.latitude) !== Number(initialContext.address.latitude) ||
        Number(context.address.longitude) !== Number(initialContext.address.longitude)
      ) {
        throw new AppError(
          'Restaurant or delivery coordinates changed; refresh available delivery slots',
          409,
          'SLOT_UNAVAILABLE'
        );
      }
      const slots = await querySlots(connection, context, date, route);
      const selected = slots.find((slot) => slot.slotId === slotId);
      if (!selected) {
        throw new AppError(SCHEDULED_DELIVERY_ERROR, 400, 'SCHEDULED_DELIVERY_UNAVAILABLE');
      }
      const start = selected.start;
      const end = selected.end;
      const [clockRows] = await connection.execute(
        `SELECT TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, ?) AS lead_seconds,
          DATE_FORMAT(DATE_SUB(?, INTERVAL ? SECOND), '%Y-%m-%d %H:%i:%s') AS trigger_at,
          DATE_FORMAT(
            GREATEST(
              DATE_SUB(?, INTERVAL (? + 600) SECOND),
              DATE_SUB(?, INTERVAL ? SECOND)
            ),
            '%Y-%m-%d %H:%i:%s'
          ) AS dispatch_at`,
        [start, start, selected.requiredLeadSeconds, start,
          route.travelSeconds, start, selected.requiredLeadSeconds]
      );
      if (!clockRows[0] || Number(clockRows[0].lead_seconds) < selected.requiredLeadSeconds) {
        throw new AppError(SCHEDULED_DELIVERY_ERROR, 400, 'SCHEDULED_DELIVERY_UNAVAILABLE');
      }

      const scheduled = {
        scheduledFor: start,
        scheduledSlotEnd: end,
        scheduledTriggerAt: clockRows[0].trigger_at,
        scheduledDispatchAt: clockRows[0].dispatch_at,
        prepMinutes: selected.prepMinutes,
        bufferMinutes: selected.bufferMinutes,
        travelSeconds: route.travelSeconds,
        distanceMeters: route.distanceMeters,
      };
      const order = await createOrderFromContext(connection, context, input, actor, scheduled);
      return order;
    }, 'READ COMMITTED');
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

  async transitionOrder(
    orderIdValue,
    action,
    note,
    actor,
    estimatedDeliveryMinutes
  ) {
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
    const estimate = action === 'confirm'
      ? positiveInteger(estimatedDeliveryMinutes, 'estimated_delivery_minutes')
      : null;
    return transaction(async (connection) => {
      const order = await model.lockOrderForTransition(connection, orderId);
      if (
        !order ||
        (transition.actor === 'CUSTOMER' && Number(order.customer_id) !== actorId) ||
        (transition.actor === 'RESTAURANT' && Number(order.restaurant_id) !== actorId)
      ) {
        throw new AppError('Order not found', 404, 'NOT_FOUND');
      }
      const canCancelUnacceptedEstimate =
        action === 'cancel' &&
        order.status === 'CONFIRMED' &&
        !order.estimated_delivery_accepted_at;
      const canCancelScheduled = action === 'cancel' && order.status === 'SCHEDULED';
      const canRejectScheduled = action === 'reject' && order.status === 'SCHEDULED';
      const canPrepareScheduled =
        action === 'prepare' &&
        ['SCHEDULED', 'PROCESSING'].includes(order.status);
      const canPreparePending = action === 'prepare' && order.status === 'PENDING';
      if (
        order.status !== transition.from &&
        !canCancelUnacceptedEstimate &&
        !canCancelScheduled &&
        !canRejectScheduled &&
        !canPrepareScheduled &&
        !canPreparePending
      ) {
        throw new AppError(
          `Order in ${order.status} cannot transition to ${transition.to}`,
          409,
          'INVALID_TRANSITION'
        );
      }
      if (canRejectScheduled && (typeof note !== 'string' || !note.trim())) {
        throw new AppError(
          'A reason is required to reject a scheduled order',
          400,
          'REJECTION_REASON_REQUIRED'
        );
      }
      const statusId = await model.getOrderStatusId(connection, transition.to);
      if (!statusId) {
        throw new AppError('Required order status configuration is missing', 500, 'CONFIGURATION_ERROR');
      }
      if (action === 'confirm') {
        await model.proposeDeliveryEstimate(connection, orderId, statusId, estimate);
      } else {
        await model.updateOrderStatus(connection, orderId, statusId);
      }
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
        note || (
          canCancelUnacceptedEstimate
            ? 'Customer rejected the delivery estimate'
            : `Order ${transition.to.toLowerCase().replace(/_/g, ' ')}`
        )
      );
      return {
        orderId,
        previousStatus: order.status,
        status: transition.to,
      };
    });
  },

  async acceptDeliveryEstimate(orderIdValue, actor) {
    const orderId = positiveId(orderIdValue, 'id');
    const customerId = requireCustomer(actor);
    return transaction(async (connection) => {
      const order = await model.lockOrderForTransition(connection, orderId);
      if (!order || Number(order.customer_id) !== customerId) {
        throw new AppError('Order not found', 404, 'NOT_FOUND');
      }
      if (
        order.status !== 'CONFIRMED' ||
        !order.estimated_delivery_minutes ||
        order.estimated_delivery_accepted_at
      ) {
        throw new AppError(
          'There is no delivery estimate awaiting your response',
          409,
          'INVALID_ESTIMATE_RESPONSE'
        );
      }
      await model.acceptDeliveryEstimate(connection, orderId);
      const statusId = await model.getOrderStatusId(connection, 'CONFIRMED');
      if (!statusId) {
        throw new AppError('Required order status configuration is missing', 500, 'CONFIGURATION_ERROR');
      }
      await model.createOrderHistory(
        connection,
        orderId,
        statusId,
        actor.userId,
        `Customer accepted the ${order.estimated_delivery_minutes}-minute delivery estimate`
      );
      return {
        orderId,
        estimatedDeliveryMinutes: Number(order.estimated_delivery_minutes),
        estimatedDeliveryAccepted: true,
      };
    });
  },
};
