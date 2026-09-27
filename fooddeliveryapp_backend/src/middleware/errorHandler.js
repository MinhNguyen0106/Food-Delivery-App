function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number.isInteger(err.statusCode)
    ? err.statusCode
    : Number.isInteger(err.status)
      ? err.status
      : 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  const code = err.name === 'AppError'
    ? err.code
    : statusCode === 400
      ? 'BAD_REQUEST'
      : statusCode === 404
        ? 'NOT_FOUND'
        : 'INTERNAL_SERVER_ERROR';

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500
      ? 'Internal server error'
      : statusCode === 400
        ? 'Invalid request'
        : err.message || 'Request failed',
    error: code,
  });
}

module.exports = errorHandler;
