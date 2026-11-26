const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { sendPasswordReset } = require('../services/mailService');
const { leetcodePublic } = require('../services/verification');

async function assertLeetcodeUser(username) {
  if (!(await leetcodePublic.usernameExists(username))) {
    throw new AppError(422, `LeetCode user "${username}" was not found. Check the spelling of your username.`, 'LEETCODE_USER_NOT_FOUND');
  }
}
exports.assertLeetcodeUser = assertLeetcodeUser;

const BCRYPT_ROUNDS = 12;
// Pre-computed hash so unknown-email logins cost the same as known ones (timing-attack resistance).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, college, graduationYear, leetcodeUsername } = req.body;
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists', 'DUPLICATE');
  await assertLeetcodeUser(leetcodeUsername);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // Role and counters are NEVER taken from the request: the strict schema rejects extra fields,
  // and the role is fixed to STUDENT here.
  const user = await User.create({ name, email, passwordHash, college, graduationYear, leetcodeUsername, role: 'STUDENT' });
  setAuthCookie(res, user);
  res.status(201).json({ success: true, user: user.toSelf() });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'Invalid email or password', 'BAD_CREDENTIALS');
  if (user.status !== 'active') throw new AppError(403, 'Your account is suspended. Contact an administrator.', 'SUSPENDED');
  setAuthCookie(res, user);
  res.json({ success: true, user: user.toSelf() });
});

exports.logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSelf() });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && user.status === 'active') {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const link = `${env.clientOrigins[0]}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    try { await sendPasswordReset(user.email, user.name, link); } catch (e) { console.error('[mail] failed', e.message); }
  }
  // Same response either way so emails cannot be enumerated.
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, email, password } = req.body;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ email, resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpires');
  if (!user) throw new AppError(400, 'Reset link is invalid or has expired', 'BAD_RESET_TOKEN');
  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.tokenVersion += 1; // signs out every existing session
  await user.save();
  res.json({ success: true, message: 'Password updated. Please sign in.' });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
    throw new AppError(400, 'Current password is incorrect', 'BAD_CREDENTIALS');
  }
  user.passwordHash = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1;
  await user.save();
  setAuthCookie(res, user);
  res.json({ success: true, message: 'Password changed' });
});
