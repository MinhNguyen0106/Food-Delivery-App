const AppError = require('./AppError');
const model = require('../models/addressModel');
const db = require('../common/db').promise();

function requireCustomer(actor) {
  if (!actor.customerId) {
    throw new AppError('Customer account is not linked to a customer record', 403, 'FORBIDDEN');
  }
  return actor.customerId;
}

function translateDatabaseError(error) {
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError('Address is in use and cannot be deleted', 409, 'ADDRESS_IN_USE');
  }
  return error;
}

async function transaction(work) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw translateDatabaseError(error);
  } finally {
    connection.release();
  }
}

async function lockCustomer(connection, customerId) {
  const [rows] = await connection.execute(
    'SELECT customer_id FROM customers WHERE customer_id = ? FOR UPDATE',
    [customerId]
  );
  if (rows.length === 0) {
    throw new AppError('Customer account is not linked to a customer record', 403, 'FORBIDDEN');
  }
}

module.exports = {
  list(actor) {
    return model.listForCustomer(requireCustomer(actor));
  },

  async get(id, actor) {
    const address = await model.getForCustomer(id, requireCustomer(actor));
    if (!address) throw new AppError('Address not found', 404, 'NOT_FOUND');
    return address;
  },

  async create(data, actor) {
    const customerId = requireCustomer(actor);
    const id = await transaction(async (connection) => {
      await lockCustomer(connection, customerId);
      if (data.is_default) {
        await connection.execute(
          'UPDATE addresses SET is_default = FALSE WHERE customer_id = ? AND is_default = TRUE',
          [customerId]
        );
      }
      return model.create(customerId, data, connection);
    });
    return model.getForCustomer(id, customerId);
  },

  async update(id, data, actor) {
    const customerId = requireCustomer(actor);
    await transaction(async (connection) => {
      if (data.is_default === true || data.is_default === 1) {
        await lockCustomer(connection, customerId);
      }
      if (!(await model.getForCustomer(id, customerId, connection))) {
        throw new AppError('Address not found', 404, 'NOT_FOUND');
      }
      if (data.is_default === true || data.is_default === 1) {
        await connection.execute(
          'UPDATE addresses SET is_default = FALSE WHERE customer_id = ? AND address_id <> ? AND is_default = TRUE',
          [customerId, id]
        );
      }
      await model.update(id, customerId, data, connection);
    });
    return model.getForCustomer(id, customerId);
  },

  async delete(id, actor) {
    const customerId = requireCustomer(actor);
    try {
      if (!(await model.delete(id, customerId))) {
        throw new AppError('Address not found', 404, 'NOT_FOUND');
      }
    } catch (error) {
      throw translateDatabaseError(error);
    }
  },
};
