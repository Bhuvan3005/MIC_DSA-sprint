const AppError = require('../utils/AppError');
const env = require('../config/env');

const notFound = (req, _res, next) => next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.expose ? err.message : 'Something went wrong';
  let code = err.code;
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    status = 400; code = 'VALIDATION'; message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400; code = 'VALIDATION'; message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409; code = 'DUPLICATE';
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `A record with this ${field} already exists`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'BAD_JSON'; message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413; code = 'TOO_LARGE'; message = 'Request body too large';
  }

  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  const body = { success: false, message, code };
  if (details) body.details = details;
  if (!env.isProd && status >= 500) body.debug = err.message;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
