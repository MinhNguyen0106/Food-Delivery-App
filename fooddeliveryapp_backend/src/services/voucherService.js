const AppError = require('./AppError');
const model = require('../models/voucherModel');
const { toCents } = require('../common/money');

function positiveId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw new AppError('voucher_id must be a positive 32-bit integer', 400, 'VALIDATION_ERROR');
  }
  return id;
}

function requiredAdmin(actor) {
  if (!actor || actor.role !== 'ADMIN') {
    throw new AppError('Administrator access is required', 403, 'FORBIDDEN');
  }
}

function datesAreOrdered(startDate, endDate) {
  return new Date(startDate.replace(' ', 'T')).getTime() <
    new Date(endDate.replace(' ', 'T')).getTime();
}

function handleDuplicate(error) {
  if (error && error.code === 'ER_DUP_ENTRY') {
    throw new AppError('Voucher code already exists', 409, 'VOUCHER_CODE_EXISTS');
  }
  throw error;
}

function adminVoucher(input, statusId) {
  return {
    code: input.code.trim(),
    discountValue: (toCents(input.discount_value, 'discount_value') / 100).toFixed(2),
    minOrderValue: (toCents(input.min_order_value, 'min_order_value') / 100).toFixed(2),
    usageLimit: Number(input.usage_limit),
    statusId,
    startDate: input.start_date.replace('T', ' '),
    endDate: input.end_date.replace('T', ' '),
  };
}

function validateCheckoutVoucher(row, subtotalCents, amountBeforeDiscountCents) {
  if (!row) throw new AppError('Voucher not found', 400, 'VOUCHER_INVALID');
  if (row.status !== 'ACTIVE') {
    throw new AppError('Voucher is not active', 409, 'VOUCHER_INACTIVE');
  }
  if (Number(row.is_in_period) !== 1) {
    throw new AppError('Voucher is outside its validity period', 409, 'VOUCHER_EXPIRED');
  }
  if (Number(row.used_count) >= Number(row.usage_limit)) {
    throw new AppError('Voucher usage limit has been reached', 409, 'VOUCHER_EXHAUSTED');
  }
  if (subtotalCents < toCents(row.min_order_value, 'Voucher minimum order value')) {
    throw new AppError('Order does not meet the voucher minimum value', 409, 'VOUCHER_MINIMUM_NOT_MET');
  }
  return {
    voucherId: row.voucher_id,
    code: row.code,
    discountCents: Math.min(
      toCents(row.discount_value, 'Voucher discount'),
      amountBeforeDiscountCents
    ),
  };
}

async function ensureCustomerHasNotUsed(connection, customerId, voucher) {
  if (await model.hasCustomerUsedVoucher(connection, customerId, voucher.voucherId)) {
    throw new AppError(
      'Each customer can use this voucher only once',
      409,
      'VOUCHER_ALREADY_USED'
    );
  }
}

module.exports = {
  async applyForCheckout(connection, code, subtotalCents, amountBeforeDiscountCents, customerId) {
    const row = await model.lockByCode(connection, code);
    const voucher = validateCheckoutVoucher(row, subtotalCents, amountBeforeDiscountCents);
    await ensureCustomerHasNotUsed(connection, customerId, voucher);
    if (!(await model.incrementUsage(connection, row.voucher_id))) {
      throw new AppError('Voucher is no longer available', 409, 'VOUCHER_EXHAUSTED');
    }
    return voucher;
  },

  async previewForCheckout(connection, code, subtotalCents, amountBeforeDiscountCents, customerId) {
    const row = await model.getByCode(connection, code);
    const voucher = validateCheckoutVoucher(row, subtotalCents, amountBeforeDiscountCents);
    await ensureCustomerHasNotUsed(connection, customerId, voucher);
    return voucher;
  },

  async list(actor) {
    requiredAdmin(actor);
    return model.list();
  },

  async listAvailable(actor) {
    if (
      !actor ||
      actor.role !== 'CUSTOMER' ||
      !Number.isSafeInteger(Number(actor.customerId)) ||
      Number(actor.customerId) < 1
    ) {
      throw new AppError('Customer access is required', 403, 'FORBIDDEN');
    }
    return model.listAvailable(Number(actor.customerId));
  },

  async get(idValue, actor) {
    requiredAdmin(actor);
    const voucher = await model.get(model.pool, positiveId(idValue));
    if (!voucher) throw new AppError('Voucher not found', 404, 'NOT_FOUND');
    return voucher;
  },

  async create(input, actor) {
    requiredAdmin(actor);
    if (!datesAreOrdered(input.start_date, input.end_date)) {
      throw new AppError('end_date must be later than start_date', 400, 'VALIDATION_ERROR');
    }
    const statusId = await model.statusId(model.pool, input.status);
    if (!statusId) throw new AppError('Voucher status configuration is missing', 500, 'CONFIGURATION_ERROR');
    try {
      const voucherId = await model.create(model.pool, adminVoucher(input, statusId));
      return { voucherId };
    } catch (error) {
      return handleDuplicate(error);
    }
  },

  async update(idValue, input, actor) {
    requiredAdmin(actor);
    const voucherId = positiveId(idValue);
    if (!datesAreOrdered(input.start_date, input.end_date)) {
      throw new AppError('end_date must be later than start_date', 400, 'VALIDATION_ERROR');
    }
    const connection = await model.pool.getConnection();
    try {
      await connection.beginTransaction();
      const current = await model.get(connection, voucherId, true);
      if (!current) throw new AppError('Voucher not found', 404, 'NOT_FOUND');
      if (Number(input.usage_limit) < Number(current.used_count)) {
        throw new AppError('usage_limit cannot be below used_count', 409, 'VOUCHER_USAGE_CONFLICT');
      }
      const statusId = await model.statusId(connection, input.status);
      if (!statusId) {
        throw new AppError('Voucher status configuration is missing', 500, 'CONFIGURATION_ERROR');
      }
      await model.update(connection, voucherId, adminVoucher(input, statusId));
      await connection.commit();
      return { voucherId };
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Database transaction rollback failed', rollbackError);
      }
      return handleDuplicate(error);
    } finally {
      connection.release();
    }
  },

  async delete(idValue, actor) {
    requiredAdmin(actor);
    const voucherId = positiveId(idValue);
    const connection = await model.pool.getConnection();
    try {
      await connection.beginTransaction();
      const current = await model.get(connection, voucherId, true);
      if (!current) throw new AppError('Voucher not found', 404, 'NOT_FOUND');
      const deleted = await model.delete(connection, voucherId);
      if (!deleted) {
        throw new AppError(
          'A used or order-linked voucher cannot be deleted; set it INACTIVE instead',
          409,
          'VOUCHER_IN_USE'
        );
      }
      await connection.commit();
      return { voucherId };
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
