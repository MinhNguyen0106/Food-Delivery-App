function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = Number.isInteger(err.statusCode)
    ? err.statusCode
    : Number.isInteger(err.status)
      ? err.status
      : 500;

  let code = err.name === 'AppError' && typeof err.code === 'string'
    ? err.code
    : statusCode === 400
      ? 'BAD_REQUEST'
      : statusCode === 404
        ? 'NOT_FOUND'
        : 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Request failed';

  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A record with the same unique value already exists';
  } else if (
    err.code === 'ER_NO_REFERENCED_ROW_2' ||
    err.code === 'ER_ROW_IS_REFERENCED_2'
  ) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'The operation conflicts with related records';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'Malformed JSON request';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  }

  if (statusCode >= 500) {
    console.error('Request failed', {
      name: err.name,
      code: err.code,
      method: req.method,
      path: req.path,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal server error' : message,
    error: code,
  });
}

module.exports = errorHandler;
