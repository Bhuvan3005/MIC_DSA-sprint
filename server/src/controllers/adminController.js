const { User, Question, VideoSolution, Completion, DailyChallenge, Competition, PointsTransaction, Streak } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { todayKey, addDays } = require('../utils/dates');
const { parsePage, pageMeta, escapeRegex } = require('../utils/pagination');
const { getSettings, updateSettings } = require('../services/settingsService');
const { voidCompletion } = require('../services/completionService');
const { resetCompetition, periodWindow } = require('../services/leaderboardService');
const { awardPoints } = require('../services/pointsService');
const { effectiveCurrent } = require('../services/streakService');

const STUDENT_FILTER = { role: 'STUDENT' };

async function dailySeries(days) {
  const today = todayKey();
  const from = addDays(today, -(days - 1));
  const rows = await Completion.aggregate([
    { $match: { voided: false, date: { $gte: from, $lte: today } } },
    { $group: { _id: '$date', completions: { $sum: 1 }, users: { $addToSet: '$user' } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = addDays(today, -i);
    const r = map.get(d);
    out.push({ date: d, completions: r ? r.completions : 0, activeStudents: r ? r.users.length : 0 });
  }
  return out;
}

exports.overview = asyncHandler(async (_req, res) => {
  const today = todayKey();
  const [students, questions, videos, publishedVideos, todayActive, completionsTotal, completionsToday, popular, recent, weekly] = await Promise.all([
    User.countDocuments(STUDENT_FILTER),
    Question.countDocuments(),
    VideoSolution.countDocuments(),
    VideoSolution.countDocuments({ published: true }),
    Completion.distinct('user', { date: today, voided: false }),
    Completion.countDocuments({ voided: false }),
    Completion.countDocuments({ date: today, voided: false }),
    Completion.aggregate([
      { $match: { voided: false } },
      { $group: { _id: '$question', completions: { $sum: 1 } } },
      { $sort: { completions: -1 } }, { $limit: 5 },
      { $lookup: { from: 'questions', localField: '_id', foreignField: '_id', as: 'q' } }, { $unwind: '$q' },
      { $project: { _id: 0, id: '$_id', title: '$q.title', difficulty: '$q.difficulty', completions: 1 } },
    ]),
    User.find(STUDENT_FILTER).sort({ createdAt: -1 }).limit(6).select('name email college createdAt').lean(),
    dailySeries(7),
  ]);
  res.json({
    success: true,
    overview: {
      totalStudents: students, activeToday: todayActive.length, totalQuestions: questions, totalVideos: videos, publishedVideos,
      completionsTotal, completionsToday, popularQuestions: popular, recentStudents: recent, weeklyActivity: weekly,
    },
  });
});

exports.analytics = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 90);
  const from = new Date(Date.now() - days * 86400000);
  const [series, byDifficulty, byTopic, signups, pointsByType, topColleges] = await Promise.all([
    dailySeries(days),
    Completion.aggregate([{ $match: { voided: false } }, { $group: { _id: '$difficulty', count: { $sum: 1 } } }]),
    Completion.aggregate([
      { $match: { voided: false } },
      { $lookup: { from: 'questions', localField: 'question', foreignField: '_id', as: 'q' } }, { $unwind: '$q' },
      { $unwind: '$q.topics' }, { $group: { _id: '$q.topics', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 },
    ]),
    User.aggregate([
      { $match: { ...STUDENT_FILTER, createdAt: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: require('../config/env').PLATFORM_TIMEZONE } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    PointsTransaction.aggregate([{ $group: { _id: '$type', points: { $sum: '$points' }, count: { $sum: 1 } } }, { $sort: { points: -1 } }]),
    User.aggregate([
      { $match: { ...STUDENT_FILTER, college: { $ne: null } } },
      { $group: { _id: '$college', students: { $sum: 1 }, points: { $sum: '$totalPoints' } } }, { $sort: { students: -1 } }, { $limit: 8 },
    ]),
  ]);
  const [students, perfectToday, challengesToday] = await Promise.all([
    User.countDocuments(STUDENT_FILTER),
    Completion.aggregate([{ $match: { date: todayKey(), voided: false } }, { $group: { _id: '$user', n: { $sum: 1 } } }, { $match: { n: { $gte: 2 } } }, { $count: 'n' }]),
    DailyChallenge.findOne({ date: todayKey(), published: true }).lean(),
  ]);
  res.json({
    success: true,
    analytics: {
      days, series,
      completionsByDifficulty: byDifficulty.map((d) => ({ difficulty: d._id, count: d.count })),
      completionsByTopic: byTopic.map((t) => ({ topic: t._id, count: t.count })),
      signups: signups.map((s) => ({ date: s._id, count: s.count })),
      pointsByType: pointsByType.map((p) => ({ type: p._id, points: p.points, count: p.count })),
      colleges: topColleges.map((c) => ({ college: c._id, students: c.students, points: c.points })),
      totals: { students, perfectDaysToday: perfectToday[0] ? perfectToday[0].n : 0, challengeToday: !!challengesToday },
    },
  });
});

// ---- Students ----
exports.students = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  filter.role = req.query.role || { $in: ['STUDENT', 'EDITOR'] };
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { college: rx }, { leetcodeUsername: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const streaks = await Streak.find({ user: { $in: users.map((u) => u._id) } }).lean();
  const sMap = new Map(streaks.map((s) => [String(s.user), s]));
  res.json({
    success: true,
    items: users.map((u) => ({
      id: u._id, name: u.name, email: u.email, college: u.college, leetcodeUsername: u.leetcodeUsername, role: u.role,
      status: u.status, createdAt: u.createdAt, totalCompleted: u.totalCompleted, totalPoints: u.totalPoints,
      currentStreak: effectiveCurrent(sMap.get(String(u._id))),
    })),
    pagination: pageMeta(page, limit, total),
  });
});

async function loadManageable(req) {
  const target = await User.findById(req.params.id);
  if (!target) throw new AppError(404, 'User not found', 'NOT_FOUND');
  if (String(target._id) === String(req.user._id)) throw new AppError(400, 'You cannot change your own account here', 'FORBIDDEN');
  if (target.role === 'ADMIN') throw new AppError(403, 'Administrator accounts cannot be modified here', 'FORBIDDEN');
  return target;
}

exports.setStatus = asyncHandler(async (req, res) => {
  const target = await loadManageable(req);
  target.status = req.body.status;
  target.tokenVersion += 1; // kills any live session immediately
  await target.save();
  res.json({ success: true, user: { id: target._id, status: target.status } });
});

exports.setRole = asyncHandler(async (req, res) => {
  const target = await loadManageable(req);
  target.role = req.body.role;
  target.tokenVersion += 1;
  await target.save();
  res.json({ success: true, user: { id: target._id, role: target.role } });
});

// ---- Settings, competitions, submissions ----
exports.getSettings = asyncHandler(async (_req, res) => res.json({ success: true, settings: await getSettings() }));
exports.putSettings = asyncHandler(async (req, res) => res.json({ success: true, settings: await updateSettings(req.body) }));

exports.competitions = asyncHandler(async (_req, res) => {
  const [items, weekly, monthly] = await Promise.all([
    Competition.find().sort({ startsAt: -1 }).limit(50).select('-finalStandings.college').lean(),
    periodWindow('weekly'), periodWindow('monthly'),
  ]);
  res.json({
    success: true, items,
    current: { weekly: { from: weekly.from, managed: !!weekly.competition }, monthly: { from: monthly.from, managed: !!monthly.competition } },
  });
});

exports.resetCompetition = asyncHandler(async (req, res) => {
  const out = await resetCompetition(req.body.type, req.user._id);
  res.json({ success: true, ...out });
});

exports.createCompetition = asyncHandler(async (req, res) => {
  const { name, type, startsAt } = req.body;
  const comp = await Competition.create({ name, type, startsAt: startsAt || new Date(), createdBy: req.user._id });
  res.status(201).json({ success: true, competition: comp });
});

exports.leaderboardStats = asyncHandler(async (_req, res) => {
  const [totals, ledger, topUsers] = await Promise.all([
    User.aggregate([{ $match: STUDENT_FILTER }, { $group: { _id: null, students: { $sum: 1 }, points: { $sum: '$totalPoints' }, completed: { $sum: '$totalCompleted' } } }]),
    PointsTransaction.countDocuments(),
    User.find({ ...STUDENT_FILTER, status: 'active' }).sort({ totalPoints: -1 }).limit(5).select('name college totalPoints').lean(),
  ]);
  res.json({ success: true, stats: { ...(totals[0] || { students: 0, points: 0, completed: 0 }), ledgerEntries: ledger, topUsers } });
});

exports.completions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const filter = {};
  if (req.query.voided) filter.voided = req.query.voided === 'true';
  if (req.query.user) filter.user = req.query.user;
  const [items, total] = await Promise.all([
    Completion.find(filter).sort({ completedAt: -1 }).skip(skip).limit(limit)
      .populate('user', 'name email college').populate('question', 'title slug difficulty').lean(),
    Completion.countDocuments(filter),
  ]);
  res.json({ success: true, items, pagination: pageMeta(page, limit, total) });
});

exports.voidCompletion = asyncHandler(async (req, res) => {
  const c = await voidCompletion(req.params.id, req.user, req.body.reason);
  res.json({ success: true, completion: c });
});

exports.adjustPoints = asyncHandler(async (req, res) => {
  const { userId, points, note } = req.body;
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  const tx = await awardPoints({
    userId, points, type: 'ADJUSTMENT', dedupeKey: `adjust:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    note, createdBy: req.user._id,
  });
  res.status(201).json({ success: true, transaction: tx });
});
