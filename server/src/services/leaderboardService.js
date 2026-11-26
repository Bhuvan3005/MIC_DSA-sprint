const mongoose = require('mongoose');
const { User, PointsTransaction, Completion, Streak, Competition } = require('../models');
const { startOfWeek, startOfMonth, todayKey } = require('../utils/dates');
const { escapeRegex } = require('../utils/pagination');
const { effectiveCurrent } = require('./streakService');
const { DateTime } = require('luxon');
const env = require('../config/env');
const { avatarUrl } = require('../utils/avatar');

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/** Period window: an active admin-managed Competition of that type wins, else the calendar week/month. */
async function periodWindow(type) {
  const comp = await Competition.findOne({ type, active: true }).sort({ startsAt: -1 }).lean();
  if (comp) return { from: comp.startsAt, to: null, competition: comp };
  return { from: type === 'weekly' ? startOfWeek() : startOfMonth(), to: null, competition: null };
}

/** Aggregation producing ranked rows: { _id: userId, points, rank } using only ledger rows in the window. */
function rankedPeriodPipeline({ from, to, college, search }) {
  const match = { createdAt: { $gte: from } };
  if (to) match.createdAt.$lt = to;
  const userMatch = { 'u.status': 'active', 'u.role': { $ne: 'ADMIN' } };
  if (college) userMatch['u.college'] = college;
  if (search) userMatch['u.name'] = { $regex: escapeRegex(search), $options: 'i' };
  return [
    { $match: match },
    { $group: { _id: '$user', points: { $sum: '$points' } } },
    { $match: { points: { $gt: 0 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $match: userMatch },
    // Ties share a rank (standard competition ranking); display order breaks ties by join date.
    { $setWindowFields: { sortBy: { points: -1 }, output: { rank: { $rank: {} } } } },
  ];
}

async function decorate(rows, { from, mode }) {
  const ids = rows.map((r) => r.userId);
  const [streaks, completedAgg] = await Promise.all([
    Streak.find({ user: { $in: ids } }).lean(),
    mode === 'global'
      ? []
      : Completion.aggregate([
        { $match: { user: { $in: ids }, voided: false, completedAt: { $gte: from } } },
        { $group: { _id: '$user', n: { $sum: 1 } } },
      ]),
  ]);
  const sMap = new Map(streaks.map((s) => [String(s.user), s]));
  const cMap = new Map(completedAgg.map((c) => [String(c._id), c.n]));
  const today = todayKey();
  return rows.map((r) => ({
    ...r,
    currentStreak: effectiveCurrent(sMap.get(String(r.userId)), today),
    questionsCompleted: mode === 'global' ? r.questionsCompleted : cMap.get(String(r.userId)) || 0,
  }));
}

const shapeUser = (u) => ({ name: u.name, college: u.college, avatarSeed: String(u._id), avatarUrl: avatarUrl(u._id, u.avatarVersion) });

async function globalBoard({ page, limit, skip, search, college, meId }) {
  const filter = { status: 'active', role: { $ne: 'ADMIN' }, ...(college ? { college } : {}), ...(search ? { name: { $regex: escapeRegex(search), $options: 'i' } } : {}) };
  const sort = { totalPoints: -1, totalCompleted: -1, createdAt: 1 };
  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const rankOf = async (u) => 1 + (await User.countDocuments({
    status: 'active', role: { $ne: 'ADMIN' }, ...(college ? { college } : {}),
    $or: [
      { totalPoints: { $gt: u.totalPoints } },
      { totalPoints: u.totalPoints, totalCompleted: { $gt: u.totalCompleted } },
      { totalPoints: u.totalPoints, totalCompleted: u.totalCompleted, createdAt: { $lt: u.createdAt } },
    ],
  }));
  const rows = [];
  for (let i = 0; i < users.length; i += 1) {
    const u = users[i];
    rows.push({ rank: search ? await rankOf(u) : skip + i + 1, userId: u._id, ...shapeUser(u), points: u.totalPoints, questionsCompleted: u.totalCompleted });
  }
  const decorated = await decorate(rows, { mode: 'global' });
  let me = null;
  if (meId) {
    const mu = await User.findById(meId).lean();
    if (mu && (!college || mu.college === college)) {
      me = { rank: await rankOf(mu), points: mu.totalPoints, questionsCompleted: mu.totalCompleted };
    }
  }
  return { rows: decorated, total, me };
}

async function periodBoard(type, { page, limit, skip, search, college, meId }) {
  const win = await periodWindow(type);
  const base = rankedPeriodPipeline({ from: win.from, to: win.to, college, search });
  const [data] = await PointsTransaction.aggregate([
    ...base,
    { $facet: { rows: [{ $sort: { rank: 1, 'u.createdAt': 1 } }, { $skip: skip }, { $limit: limit }], total: [{ $count: 'n' }] } },
  ]);
  const rows = data.rows.map((r) => ({
    rank: r.rank, userId: r._id, ...shapeUser(r.u), points: r.points,
  }));
  const decorated = await decorate(rows, { from: win.from, mode: type });
  let me = null;
  if (meId) {
    const mine = await PointsTransaction.aggregate([
      ...rankedPeriodPipeline({ from: win.from, to: win.to, college }),
      { $match: { _id: oid(meId) } },
    ]);
    if (mine[0]) me = { rank: mine[0].rank, points: mine[0].points };
  }
  return { rows: decorated, total: data.total[0] ? data.total[0].n : 0, me, window: { from: win.from, competition: win.competition ? { id: win.competition._id, name: win.competition.name } : null } };
}

async function collegeRanking({ limit = 50 } = {}) {
  return User.aggregate([
    { $match: { status: 'active', role: { $ne: 'ADMIN' }, college: { $exists: true, $ne: null } } },
    { $group: { _id: '$college', points: { $sum: '$totalPoints' }, students: { $sum: 1 }, completed: { $sum: '$totalCompleted' } } },
    { $sort: { points: -1 } },
    { $limit: limit },
    { $project: { _id: 0, college: '$_id', points: 1, students: 1, completed: 1 } },
  ]);
}

/** Global rank for a single user (used on profiles / dashboard). */
async function globalRank(userId) {
  const u = await User.findById(userId).lean();
  if (!u) return null;
  return 1 + (await User.countDocuments({
    status: 'active', role: { $ne: 'ADMIN' },
    $or: [
      { totalPoints: { $gt: u.totalPoints } },
      { totalPoints: u.totalPoints, totalCompleted: { $gt: u.totalCompleted } },
      { totalPoints: u.totalPoints, totalCompleted: u.totalCompleted, createdAt: { $lt: u.createdAt } },
    ],
  }));
}

/** Closes the active competition of a type (freezing standings) and opens a fresh one. History is retained. */
async function resetCompetition(type, adminId) {
  const now = new Date();
  const active = await Competition.findOne({ type, active: true }).sort({ startsAt: -1 });
  const from = active ? active.startsAt : (type === 'weekly' ? startOfWeek() : startOfMonth());
  const top = await PointsTransaction.aggregate([
    ...rankedPeriodPipeline({ from, to: now }),
    { $sort: { rank: 1, 'u.createdAt': 1 } }, { $limit: 100 },
  ]);
  const standings = top.map((r) => ({ user: r._id, name: r.u.name, college: r.u.college, points: r.points, rank: r.rank }));
  if (active) {
    active.active = false; active.endsAt = now; active.finalStandings = standings;
    await active.save();
  } else if (standings.length) {
    await Competition.create({ name: `${type} (calendar period)`, type, startsAt: from, endsAt: now, active: false, finalStandings: standings, createdBy: adminId });
  }
  const label = DateTime.fromJSDate(now, { zone: env.PLATFORM_TIMEZONE }).toFormat(type === 'monthly' ? 'LLLL yyyy' : "'Week of' dd LLL yyyy");
  const next = await Competition.create({ name: `${type === 'monthly' ? 'Monthly' : 'Weekly'} Competition – ${label}`, type, startsAt: now, active: true, createdBy: adminId });
  return { closed: active ? active._id : null, next };
}

module.exports = { globalBoard, periodBoard, collegeRanking, globalRank, resetCompetition, periodWindow };
