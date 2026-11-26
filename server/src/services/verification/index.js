/**
 * Verification adapter registry. The default adapter checks the student's public LeetCode profile
 * (see leetcodePublic.js). Add other sources by implementing { method, verify() } and calling
 * registerAdapter(). verify() must return { method, status: 'verified' } or throw an AppError.
 */
const leetcodePublic = require('./leetcodePublic');
const selfReported = require('./selfReported');

const adapters = { [leetcodePublic.method]: leetcodePublic, [selfReported.method]: selfReported };
// VERIFICATION_MODE=self is for local experiments only; production uses LeetCode verification.
const DEFAULT_METHOD = process.env.VERIFICATION_MODE === 'self' ? selfReported.method : leetcodePublic.method;

const verifyCompletion = (ctx, method = DEFAULT_METHOD) => (adapters[method] || adapters[DEFAULT_METHOD]).verify(ctx);
const registerAdapter = (adapter) => { adapters[adapter.method] = adapter; };

module.exports = { verifyCompletion, registerAdapter, leetcodePublic };
