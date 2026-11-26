const { PointsTransaction, User } = require('../models');

/**
 * Grants points exactly once per dedupeKey. The unique index on dedupeKey is the
 * source of truth: a repeated call is a no-op and returns null.
 */
async function awardPoints({ userId, points, type, dedupeKey, date, completion, note, createdBy }) {
  if (!points) return null;
  let tx;
  try {
    tx = await PointsTransaction.create({ user: userId, points, type, dedupeKey, date, completion, note, createdBy });
  } catch (err) {
    if (err.code === 11000) return null; // already granted
    throw err;
  }
  await User.updateOne({ _id: userId }, { $inc: { totalPoints: points } });
  return tx;
}

/** Reverses every positive transaction attached to a completion (append-only: new negative rows). */
async function reverseForCompletion(completionId, adminId, note) {
  const txs = await PointsTransaction.find({ completion: completionId, points: { $gt: 0 } });
  const out = [];
  for (const t of txs) {
    const r = await awardPoints({
      userId: t.user, points: -t.points, type: 'REVERSAL', dedupeKey: `reversal:${t._id}`,
      date: t.date, completion: completionId, note: note || 'Completion voided', createdBy: adminId,
    });
    if (r) out.push(r);
  }
  return out;
}

module.exports = { awardPoints, reverseForCompletion };
