const asyncHandler = require('../utils/asyncHandler');
const { parsePage, pageMeta } = require('../utils/pagination');
const lb = require('../services/leaderboardService');

const respond = (res, page, limit, out) => res.json({
  success: true, items: out.rows, me: out.me, window: out.window, pagination: pageMeta(page, limit, out.total),
});

exports.global = asyncHandler(async (req, res) => {
  const p = parsePage(req.query, { defaultLimit: 20 });
  respond(res, p.page, p.limit, await lb.globalBoard({ ...p, search: req.query.search, college: req.query.college, meId: req.user && req.user._id }));
});

const period = (type) => asyncHandler(async (req, res) => {
  const p = parsePage(req.query, { defaultLimit: 20 });
  respond(res, p.page, p.limit, await lb.periodBoard(type, { ...p, search: req.query.search, college: req.query.college, meId: req.user && req.user._id }));
});
exports.weekly = period('weekly');
exports.monthly = period('monthly');

exports.college = asyncHandler(async (req, res) => {
  const p = parsePage(req.query, { defaultLimit: 20 });
  const college = req.query.college || (req.user && req.user.college);
  if (!college) return res.json({ success: true, college: null, items: [], me: null, pagination: pageMeta(1, p.limit, 0) });
  const out = await lb.globalBoard({ ...p, search: req.query.search, college, meId: req.user && req.user._id });
  res.json({ success: true, college, items: out.rows, me: out.me, pagination: pageMeta(p.page, p.limit, out.total) });
});

exports.colleges = asyncHandler(async (_req, res) => {
  res.json({ success: true, items: await lb.collegeRanking() });
});
