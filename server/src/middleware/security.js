const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const limiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max: env.isTest ? 10000 : max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, message, 'RATE_LIMITED')),
});

const apiLimiter = limiter(15 * 60 * 1000, 600, 'Too many requests, please slow down');
const authLimiter = limiter(15 * 60 * 1000, 30, 'Too many authentication attempts, try again later');
const completionLimiter = limiter(60 * 1000, 30, 'Too many completion requests');

/**
 * CSRF defence for cookie auth: browsers cannot attach a custom header cross-origin
 * without a CORS preflight, which our strict origin allow-list rejects.
 */
function requireCustomHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'codesprint') {
    return next(new AppError(403, 'Missing required request header', 'CSRF'));
  }
  next();
}

module.exports = { apiLimiter, authLimiter, completionLimiter, requireCustomHeader };
