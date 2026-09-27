const authService = require('../services/authService');
const AppError = require('../services/AppError');

function requireObjectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }
  return body;
}

exports.register = async (req, res) => {
  const result = await authService.registerCustomer(requireObjectBody(req.body));
  return res.status(201).json({ success: true, data: result });
};

exports.login = async (req, res) => {
  const body = requireObjectBody(req.body);
  if (Object.keys(body).some((field) => !['email', 'password'].includes(field))) {
    throw new AppError('Login contains unsupported fields', 400, 'VALIDATION_ERROR');
  }
  const result = await authService.login(body.email, body.password);
  return res.status(200).json({ success: true, data: result });
};

exports.logout = async (req, res) => {
  await authService.logout(req.user);
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.getProfile = async (req, res) => {
  const user = await authService.getProfile(req.user.userId);
  return res.status(200).json({ success: true, data: user });
};

exports.updateProfile = async (req, res) => {
  const user = await authService.updateProfile(req.user, requireObjectBody(req.body));
  return res.status(200).json({ success: true, data: user });
};

exports.changePassword = async (req, res) => {
  const body = requireObjectBody(req.body);
  if (
    Object.keys(body).some((field) => !['currentPassword', 'newPassword'].includes(field)) ||
    Object.keys(body).length !== 2
  ) {
    throw new AppError('Current and new passwords are required', 400, 'VALIDATION_ERROR');
  }
  await authService.changePassword(req.user, body.currentPassword, body.newPassword);
  return res.status(200).json({
    success: true,
    message: 'Password changed. Sign in again with the new password.',
  });
};
