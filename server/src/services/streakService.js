const { Streak, Completion } = require('../models');
const { todayKey, addDays } = require('../utils/dates');

/**
 * Streak rules (all dates are platform-timezone keys derived from the SERVER clock):
 *  - A "completed day" is a day on which ALL assigned questions were completed.
 *  - Completing consecutive completed days extends the streak; a gap resets it to 1 on the next completed day.
 *  - The *displayed* current streak is 0 once a full day has been missed (see effectiveCurrent).
 */

/** Current streak as of `today`: still alive if last completed day is today or yesterday. */
function effectiveCurrent(streak, today = todayKey()) {
  if (!streak || !streak.lastCompletedDate) return 0;
  if (streak.lastCompletedDate === today || streak.lastCompletedDate === addDays(today, -1)) return streak.current;
  return 0;
}

/**
 * Registers a perfect day. Returns { applied, current, longest, streakStartDate }.
 * `applied` is false when the day had already been counted (idempotent / race-safe).
 */
async function applyPerfectDay(userId, date) {
  await Streak.updateOne({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true });
  const s = await Streak.findOne({ user: userId });
  if (s.lastCompletedDate === date) return { applied: false, current: s.current, longest: s.longest, streakStartDate: s.streakStartDate };

  const continues = s.lastCompletedDate && s.lastCompletedDate === addDays(date, -1);
  const current = continues ? s.current + 1 : 1;
  const streakStartDate = continues ? s.streakStartDate : date;
  const longest = Math.max(s.longest, current);

  // Conditional write: only one concurrent request can advance the streak for this date.
  const res = await Streak.updateOne(
    { user: userId, lastCompletedDate: s.lastCompletedDate ?? null },
    { $set: { current, longest, lastCompletedDate: date, streakStartDate }, $inc: { perfectDays: 1 } },
  );
  if (!res.modifiedCount) return { applied: false, current: s.current, longest: s.longest, streakStartDate: s.streakStartDate };
  return { applied: true, current, longest, streakStartDate };
}

async function markActiveDay(userId) {
  await Streak.updateOne({ user: userId }, { $inc: { activeDays: 1 }, $setOnInsert: { user: userId } }, { upsert: true });
}

/** Rebuilds a user's streak document purely from stored completion records. */
async function recompute(userId) {
  const days = await Completion.aggregate([
    { $match: { user: userId, voided: false } },
    { $group: { _id: '$challenge', date: { $first: '$date' }, n: { $sum: 1 } } },
    { $lookup: { from: 'dailychallenges', localField: '_id', foreignField: '_id', as: 'c' } },
    { $unwind: '$c' },
    { $project: { date: 1, perfect: { $gte: ['$n', { $size: '$c.questions' }] } } },
    { $sort: { date: 1 } },
  ]);
  const perfect = days.filter((d) => d.perfect).map((d) => d.date);
  let longest = 0; let run = 0; let prev = null; let runStart = null; let current = 0; let startDate = null;
  for (const d of perfect) {
    if (prev && addDays(prev, 1) === d) run += 1; else { run = 1; runStart = d; }
    longest = Math.max(longest, run);
    prev = d; current = run; startDate = runStart;
  }
  const doc = await Streak.findOneAndUpdate(
    { user: userId },
    { $set: { current, longest, lastCompletedDate: prev || null, streakStartDate: startDate || null, activeDays: days.length, perfectDays: perfect.length } },
    { upsert: true, new: true },
  );
  return doc;
}

async function getSummary(userId, today = todayKey()) {
  const s = await Streak.findOne({ user: userId }).lean();
  return {
    current: effectiveCurrent(s, today),
    longest: s ? s.longest : 0,
    activeDays: s ? s.activeDays : 0,
    perfectDays: s ? s.perfectDays || 0 : 0,
    lastCompletedDate: s ? s.lastCompletedDate : null,
  };
}

/** Per-day completion counts for the heatmap (default last 365 days). */
async function getHeatmap(userId, days = 365, today = todayKey()) {
  const from = addDays(today, -(days - 1));
  const rows = await Completion.aggregate([
    { $match: { user: userId, voided: false, date: { $gte: from, $lte: today } } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, count: r.count }));
}

async function monthlyActiveDays(userId, today = todayKey()) {
  const prefix = today.slice(0, 7);
  const rows = await Completion.distinct('date', { user: userId, voided: false, date: { $regex: `^${prefix}` } });
  return rows.length;
}

module.exports = { effectiveCurrent, applyPerfectDay, markActiveDay, recompute, getSummary, getHeatmap, monthlyActiveDays };
