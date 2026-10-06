const service = require('../services/adminService');

function handle(action, statusCode = 200) {
  return async (req, res, next) => {
    try {
      return res.status(statusCode).json({
        success: true,
        data: await action(req),
      });
    } catch (error) {
      return next(error);
    }
  };
}

exports.listCustomers = handle((req) => service.listCustomers(req.query, req.user));
exports.getCustomer = handle((req) => service.getCustomer(req.params.id, req.user));
exports.setCustomerStatus = handle((req) =>
  service.setCustomerStatus(req.params.id, req.body.status, req.user)
);
exports.listRestaurants = handle((req) => service.listRestaurants(req.query, req.user));
exports.createRestaurant = handle((req) => service.createRestaurant(req.body, req.user), 201);
exports.getRestaurant = handle((req) => service.getRestaurant(req.params.id, req.user));
exports.setRestaurantStatus = handle((req) =>
  service.updateRestaurantStatus(req.params.id, req.body.status, req.user)
);
exports.listShippers = handle((req) => service.listShippers(req.query, req.user));
exports.createShipper = handle((req) => service.createShipper(req.body, req.user), 201);
exports.getShipper = handle((req) => service.getShipper(req.params.id, req.user));
exports.setShipperStatus = handle((req) =>
  service.setShipperStatus(req.params.id, req.body.status, req.user)
);
exports.listOrders = handle((req) => service.listOrders(req.query, req.user));
exports.getOrder = handle((req) => service.getOrder(req.params.id, req.user));
