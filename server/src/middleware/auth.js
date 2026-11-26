const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');
const { ROLES } = require('../config/constants');

const COOKIE_NAME = 'cs_token';

async function resolveUser(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
  const user = await User.findById(payload.sub);
  // tokenVersion lets us invalidate all sessions (suspension, role change, password reset).
  if (!user || user.tokenVersion !== payload.v) return null;
  return user;
}

/** Requires a valid session; rejects suspended accounts. Role always comes from the DB, never the token. */
const authenticate = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  if (user.status !== 'active') throw new AppError(403, 'Your account is suspended', 'SUSPENDED');
  req.user = user;
  next();
});

/** Attaches req.user when a valid session exists, otherwise continues anonymously. */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (user && user.status === 'active') req.user = user;
  next();
});

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  if (!roles.includes(req.user.role)) return next(new AppError(403, 'You do not have permission to do this', 'FORBIDDEN'));
  next();
};

const requireStaff = requireRole(ROLES.ADMIN, ROLES.EDITOR);
const requireAdmin = requireRole(ROLES.ADMIN);

function signToken(user) {
  return jwt.sign({ sub: String(user._id), v: user.tokenVersion }, env.JWT_SECRET, { expiresIn: `${env.JWT_EXPIRES_DAYS}d` });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.crossSiteCookies ? 'none' : 'lax',
    maxAge: env.JWT_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

const setAuthCookie = (res, user) => res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });

module.exports = { authenticate, optionalAuth, requireRole, requireStaff, requireAdmin, setAuthCookie, clearAuthCookie, COOKIE_NAME };
