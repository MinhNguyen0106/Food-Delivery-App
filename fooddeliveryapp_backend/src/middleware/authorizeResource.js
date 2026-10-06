const db = require('../common/db');
const AppError = require('../services/AppError');

const ADMIN = ['ADMIN'];
const ALL_ACTORS = ['CUSTOMER', 'RESTAURANT', 'SHIPPER', 'ADMIN'];
const policies = {
  addresses: { read: ['CUSTOMER', 'ADMIN'], write: ['CUSTOMER'] },
  admins: { read: ADMIN, write: [] },
  cart_items: { read: ['CUSTOMER', 'ADMIN'], write: [] },
  carts: { read: ['CUSTOMER', 'ADMIN'], write: [] },
  categories: { read: ['CUSTOMER', 'RESTAURANT', 'ADMIN'], write: ADMIN },
  customer_profiles: { read: ['CUSTOMER', 'ADMIN'], write: [] },
  customers: { read: ['CUSTOMER', 'ADMIN'], write: [] },
  deliveries: { read: ALL_ACTORS, write: [] },
  food_statuses: { read: ALL_ACTORS, write: [] },
  foods: { read: ['CUSTOMER', 'RESTAURANT', 'ADMIN'], write: ['RESTAURANT'] },
  order_details: { read: ALL_ACTORS, write: [] },
  order_status_history: { read: ALL_ACTORS, write: [] },
  order_statuses: { read: ALL_ACTORS, write: [] },
  orders: { read: ALL_ACTORS, write: [] },
  payment_methods: { read: ALL_ACTORS, write: [] },
  payment_statuses: { read: ALL_ACTORS, write: [] },
  payments: { read: ALL_ACTORS, write: [] },
  restaurant_statuses: { read: ALL_ACTORS, write: [] },
  restaurants: { read: ['CUSTOMER', 'RESTAURANT', 'ADMIN'], write: [] },
  review_statuses: { read: ALL_ACTORS, write: [] },
  reviews: { read: ALL_ACTORS, write: [] },
  shipper_statuses: { read: ALL_ACTORS, write: [] },
  shippers: { read: ['SHIPPER', 'ADMIN'], write: [] },
  user_roles: { read: ADMIN, write: [] },
  user_statuses: { read: ADMIN, write: [] },
  users: { read: ['CUSTOMER', 'RESTAURANT', 'SHIPPER', 'ADMIN'], write: [] },
  voucher_statuses: { read: ['CUSTOMER', 'ADMIN'], write: [] },
  vouchers: { read: ['CUSTOMER', 'ADMIN'], write: ADMIN },
};

const ownershipQueries = {
  admins: 'SELECT 1 FROM admins WHERE admin_id = ? AND user_id = ?',
  cart_items: `SELECT 1 FROM cart_items i
    JOIN carts c ON c.cart_id = i.cart_id
    WHERE i.cart_item_id = ? AND c.customer_id = ?`,
  carts: 'SELECT 1 FROM carts WHERE cart_id = ? AND customer_id = ?',
  customer_profiles: `SELECT 1 FROM customer_profiles p
    JOIN customers c ON c.customer_id = p.customer_id
    WHERE p.profile_id = ? AND c.user_id = ?`,
  customers: 'SELECT 1 FROM customers WHERE customer_id = ? AND user_id = ?',
  addresses: 'SELECT 1 FROM addresses WHERE address_id = ? AND customer_id = ?',
  deliveries: `SELECT 1 FROM deliveries d
    JOIN orders o ON o.order_id = d.order_id
    WHERE d.delivery_id = ? AND (
      (? = 'CUSTOMER' AND o.customer_id = ?) OR
      (? = 'RESTAURANT' AND o.restaurant_id = ?) OR
      (? = 'SHIPPER' AND d.shipper_id = ?)
    )`,
  foods: `SELECT 1 FROM foods f
    JOIN restaurants r ON r.restaurant_id = f.restaurant_id
    WHERE f.food_id = ? AND r.user_id = ?`,
  order_details: `SELECT 1 FROM order_details d
    JOIN orders o ON o.order_id = d.order_id
    WHERE d.order_detail_id = ? AND (
      (? = 'CUSTOMER' AND o.customer_id = ?) OR
      (? = 'RESTAURANT' AND o.restaurant_id = ?) OR
      (? = 'SHIPPER' AND EXISTS (
        SELECT 1 FROM deliveries delivery
        WHERE delivery.order_id = o.order_id AND delivery.shipper_id = ?
      ))
    )`,
  order_status_history: `SELECT 1 FROM order_status_history h
    JOIN orders o ON o.order_id = h.order_id
    WHERE h.history_id = ? AND (
      (? = 'CUSTOMER' AND o.customer_id = ?) OR
      (? = 'RESTAURANT' AND o.restaurant_id = ?) OR
      (? = 'SHIPPER' AND EXISTS (
        SELECT 1 FROM deliveries delivery
        WHERE delivery.order_id = o.order_id AND delivery.shipper_id = ?
      ))
    )`,
  orders: `SELECT 1 FROM orders o
    WHERE o.order_id = ? AND (
      (? = 'CUSTOMER' AND o.customer_id = ?) OR
      (? = 'RESTAURANT' AND o.restaurant_id = ?) OR
      (? = 'SHIPPER' AND EXISTS (
        SELECT 1 FROM deliveries d
        WHERE d.order_id = o.order_id AND d.shipper_id = ?
      ))
    )`,
  payments: `SELECT 1 FROM payments p
    JOIN orders o ON o.order_id = p.order_id
    WHERE p.payment_id = ? AND (
      (? = 'CUSTOMER' AND o.customer_id = ?) OR
      (? = 'RESTAURANT' AND o.restaurant_id = ?) OR
      (? = 'SHIPPER' AND EXISTS (
        SELECT 1 FROM deliveries d
        WHERE d.order_id = o.order_id AND d.shipper_id = ?
      ))
    )`,
  restaurants: 'SELECT 1 FROM restaurants WHERE restaurant_id = ? AND user_id = ?',
  reviews: `SELECT 1 FROM reviews review
    JOIN orders o ON o.order_id = review.order_id
    WHERE review.review_id = ? AND (
      (? = 'CUSTOMER' AND review.customer_id = ?) OR
      (? = 'RESTAURANT' AND o.restaurant_id = ?)
    )`,
  shippers: 'SELECT 1 FROM shippers WHERE shipper_id = ? AND user_id = ?',
  users: 'SELECT 1 FROM users WHERE user_id = ?',
};

const listRoles = {
  food_statuses: ALL_ACTORS,
  order_statuses: ALL_ACTORS,
  payment_methods: ALL_ACTORS,
  payment_statuses: ALL_ACTORS,
  restaurant_statuses: ALL_ACTORS,
  review_statuses: ALL_ACTORS,
  shipper_statuses: ALL_ACTORS,
  users: ADMIN,
  admins: ADMIN,
  customers: ADMIN,
  customer_profiles: ADMIN,
  shippers: ADMIN,
  user_roles: ADMIN,
  user_statuses: ADMIN,
  admins: [],
};

function isRead(method) {
  return method === 'GET' || method === 'HEAD';
}

function forbidden(message = 'You are not allowed to perform this operation') {
  return new AppError(message, 403, 'FORBIDDEN');
}

async function isOwner(resource, recordId, user) {
  if (resource === 'users') {
    return Number(recordId) === Number(user.userId);
  }

  const query = ownershipQueries[resource];
  if (!query) {
    return false;
  }

  let params;
  switch (resource) {
    case 'admins':
      params = [recordId, user.userId];
      break;
    case 'cart_items':
      params = [recordId, user.customerId];
      break;
    case 'carts':
    case 'addresses':
      params = [recordId, user.customerId];
      break;
    case 'customer_profiles':
      params = [recordId, user.userId];
      break;
    case 'customers':
      params = [recordId, user.userId];
      break;
    case 'deliveries':
      params = [recordId, user.role, user.customerId || 0, user.role, user.restaurantId || 0, user.role, user.shipperId || 0];
      break;
    case 'foods':
    case 'restaurants':
    case 'shippers':
      params = [recordId, user.userId];
      break;
    case 'order_details':
    case 'order_status_history':
    case 'orders':
    case 'payments':
      params = [recordId, user.role, user.customerId || 0, user.role, user.restaurantId || 0, user.shipperId || 0];
      break;
    case 'reviews':
      params = [recordId, user.role, user.customerId || 0, user.role, user.restaurantId || 0];
      break;
    default:
      return false;
  }

  const [rows] = await db.promise().execute(query, params);
  return rows.length > 0;
}

function sanitizeWrite(resource, body, user, method) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const fieldsByResource = {
    addresses: ['address_name', 'receiver_name', 'receiver_phone', 'full_address', 'latitude', 'longitude', 'note', 'is_default'],
    cart_items: ['cart_id', 'food_id', 'quantity'],
    carts: ['restaurant_id'],
    categories: ['name', 'description', 'is_active'],
    foods: ['category_id', 'name', 'description', 'price', 'image', 'status_id'],
    users: ['status_id'],
  };
  const fields = fieldsByResource[resource];
  if (!fields) {
    throw forbidden();
  }

  if (Object.keys(body).some((field) => !fields.includes(field))) {
    throw new AppError('Request contains unsupported fields', 400, 'VALIDATION_ERROR');
  }

  const clean = Object.fromEntries(Object.entries(body));
  if ((resource === 'addresses' || resource === 'carts') && user.role !== 'ADMIN') {
    clean.customer_id = user.customerId;
  }
  if (resource === 'foods' && user.role !== 'ADMIN') {
    clean.restaurant_id = user.restaurantId;
  }
  return clean;
}

module.exports = function authorizeResource(resource) {
  const policy = policies[resource];
  if (!policy) {
    throw new Error(`Missing access policy for resource: ${resource}`);
  }

  return async function resourceAuthorization(req, res, next) {
    const read = isRead(req.method);
    const allowedRoles = read ? policy.read : policy.write;
    if (!allowedRoles.includes(req.user.role)) {
      return next(forbidden());
    }
    if (
      req.user.role === 'RESTAURANT' &&
      req.user.restaurantStatus !== 'ACTIVE'
    ) {
      return next(new AppError(
        'Restaurant must be active to perform this operation',
        403,
        'RESTAURANT_NOT_ACTIVE'
      ));
    }

    try {
      const segments = req.originalUrl.split('?')[0].split('/').filter(Boolean);
      const resourceIndex = segments.lastIndexOf(resource);
      const recordId = req.params.id || (resourceIndex >= 0 ? segments[resourceIndex + 1] : undefined);
      if (!recordId) {
        if (req.method === 'POST') {
          if (resource === 'users') {
            return next(forbidden('Create accounts through the authentication flow'));
          }
          req.body = sanitizeWrite(resource, req.body, req.user, req.method);
          return next();
        }
        const allowedListRoles = listRoles[resource] || ADMIN;
        if (!allowedListRoles.includes(req.user.role)) {
          return next(forbidden('Collection access is restricted; use a self-service endpoint'));
        }
        return next();
      }

      if (
        (req.user.role !== 'ADMIN' || resource === 'admins') &&
        !(await isOwner(resource, recordId, req.user))
      ) {
        return next(forbidden());
      }

      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        req.body = sanitizeWrite(resource, req.body, req.user, req.method);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
