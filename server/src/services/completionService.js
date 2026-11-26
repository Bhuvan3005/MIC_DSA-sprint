const { Completion, DailyChallenge, User, Question } = require('../models');
const AppError = require('../utils/AppError');
const { todayKey } = require('../utils/dates');
const { getSettings } = require('./settingsService');
const { awardPoints, reverseForCompletion } = require('./pointsService');
const streakService = require('./streakService');
const badgeService = require('./badgeService');
const { verifyCompletion } = require('./verification');

/**
 * Records a (self-reported) completion for one of today's assigned questions.
 * The date ALWAYS comes from the server clock; the client cannot choose it.
 */
async function recordCompletion(user, questionId) {
  // Administrators run the platform: their activity never counts towards points, streaks or rankings.
  if (user.role === 'ADMIN') {
    throw new AppError(403, 'Admin accounts do not take part in challenges. Use a student account to participate.', 'ADMIN_NOT_ELIGIBLE');
  }
  const date = todayKey();
  const challenge = await DailyChallenge.findOne({ date, published: true });
  if (!challenge) throw new AppError(404, "There is no challenge published for today", 'NO_CHALLENGE');
  if (!challenge.questions.some((q) => String(q) === String(questionId))) {
    throw new AppError(400, "That question is not part of today's challenge", 'NOT_ASSIGNED');
  }

  const existing = await Completion.findOne({ user: user._id, challenge: challenge._id, question: questionId });
  if (existing) throw new AppError(409, 'You have already recorded this question', 'ALREADY_COMPLETED');

  const question = await Question.findById(questionId).lean();
  const verification = await verifyCompletion({ user, question, date });
  if (verification.status === 'rejected') throw new AppError(422, 'Completion could not be verified', 'VERIFICATION_FAILED');
  // Adapters throw on failure, so reaching here means the solve was verified (or self-report mode in dev).

  const priorCount = await Completion.countDocuments({ user: user._id, challenge: challenge._id });
  let completion;
  try {
    completion = await Completion.create({
      user: user._id, question: questionId, challenge: challenge._id, date, difficulty: question.difficulty,
      order: Math.min(priorCount + 1, 5),
      verificationMethod: verification.method, verificationStatus: verification.status,
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'You have already recorded this question', 'ALREADY_COMPLETED');
    throw err;
  }

  const settings = await getSettings();
  const s = settings.scoring;
  const events = [];
  const order = completion.order;
  const type = order === 1 ? 'FIRST_QUESTION' : order === 2 ? 'SECOND_QUESTION' : 'EXTRA_QUESTION';
  const base = order === 1 ? s.firstQuestion : s.secondQuestion;

  const pointsTx = await awardPoints({
    userId: user._id, points: base, type, dedupeKey: `daily:${user._id}:${challenge._id}:${questionId}`,
    date, completion: completion._id,
  });
  if (pointsTx) events.push({ type, points: base });

  await User.updateOne({ _id: user._id }, {
    $inc: { totalCompleted: 1, [`completedByDifficulty.${question.difficulty}`]: 1 },
    $set: { lastActiveAt: new Date() },
  });
  if (priorCount === 0) await streakService.markActiveDay(user._id);

  const total = challenge.questions.length;
  const perfect = priorCount + 1 >= total;
  let streakInfo = null;
  if (perfect) {
    const bonus = await awardPoints({
      userId: user._id, points: s.bothBonus, type: 'BOTH_BONUS', dedupeKey: `bonus:${user._id}:${challenge._id}`,
      date, completion: completion._id,
    });
    if (bonus) events.push({ type: 'BOTH_BONUS', points: s.bothBonus });

    streakInfo = await streakService.applyPerfectDay(user._id, date);
    if (streakInfo.applied) {
      const milestones = [[7, 'STREAK_7', s.streak7], [30, 'STREAK_30', s.streak30]];
      for (const [days, mType, pts] of milestones) {
        if (streakInfo.current === days) {
          const tx = await awardPoints({
            userId: user._id, points: pts, type: mType,
            dedupeKey: `streak${days}:${user._id}:${streakInfo.streakStartDate}`, date,
          });
          if (tx) events.push({ type: mType, points: pts });
        }
      }
    }
  }

  const newBadges = await badgeService.checkAndAward(user._id);
  const fresh = await User.findById(user._id).lean();
  return {
    completion: { id: completion._id, question: String(questionId), date, order, verificationStatus: completion.verificationStatus },
    perfectDay: perfect,
    pointsEarned: events.reduce((a, e) => a + e.points, 0),
    events,
    streak: await streakService.getSummary(user._id),
    newBadges: newBadges.map((b) => ({ key: b.key, name: b.name, icon: b.icon, description: b.description, tier: badgeService.tierOf(b.key), xp: badgeService.TIER_XP[badgeService.tierOf(b.key)] })),
    totalPoints: fresh.totalPoints,
  };
}

/** Admin: invalidate a completion. Points are reversed with ledger rows and the streak rebuilt from records. */
async function voidCompletion(completionId, admin, reason) {
  const c = await Completion.findById(completionId);
  if (!c) throw new AppError(404, 'Completion not found', 'NOT_FOUND');
  if (c.voided) throw new AppError(409, 'Completion is already voided', 'ALREADY_VOIDED');
  c.voided = true; c.voidReason = reason; c.voidedBy = admin._id; c.verificationStatus = 'rejected';
  await c.save();
  await reverseForCompletion(c._id, admin._id, reason);
  await User.updateOne({ _id: c.user }, { $inc: { totalCompleted: -1, [`completedByDifficulty.${c.difficulty}`]: -1 } });
  await streakService.recompute(c.user);
  return c;
}

async function listMine(userId, { limit = 50 } = {}) {
  return Completion.find({ user: userId, voided: false }).sort({ completedAt: -1 }).limit(limit)
    .populate('question', 'title slug difficulty topics').lean();
}

module.exports = { recordCompletion, voidCompletion, listMine };
