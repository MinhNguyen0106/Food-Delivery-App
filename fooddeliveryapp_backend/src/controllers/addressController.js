const service = require('../services/addressService');

function handle(action, status = 200) {
  return async function controller(req, res, next) {
    try {
      const data = await action(req);
      return res.status(status).json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  };
}

exports.list = handle((req) => service.list(req.user));
exports.get = handle((req) => service.get(req.params.id, req.user));
exports.create = handle((req) => service.create(req.body, req.user), 201);
exports.update = handle((req) => service.update(req.params.id, req.body, req.user));
exports.delete = async (req, res, next) => {
  try {
    await service.delete(req.params.id, req.user);
    return res.status(200).json({ success: true, message: 'Address deleted' });
  } catch (error) {
    return next(error);
  }
};
