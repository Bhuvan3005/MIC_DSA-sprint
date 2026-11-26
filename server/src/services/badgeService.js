const { Badge, UserBadge, User, Streak } = require('../models');

// `tier` is cosmetic (rarity shown in the UI) and `xp` is a display score, never used for ranking.
const TIER_XP = { common: 10, rare: 25, epic: 50, legendary: 100 };
const DEFAULT_BADGES = [
  { key: 'first-solve', name: 'First Blood', description: 'Complete your first daily question', icon: 'zap', tier: 'common', rule: { type: 'completed', threshold: 1 } },
  { key: 'perfect-day', name: 'Perfect Day', description: 'Finish every daily question in a day', icon: 'target', tier: 'common', rule: { type: 'perfectDays', threshold: 1 } },
  { key: 'solved-10', name: 'Getting Warm', description: 'Complete 10 questions', icon: 'flame', tier: 'common', rule: { type: 'completed', threshold: 10 } },
  { key: 'solved-25', name: 'Sharpshooter', description: 'Complete 25 questions', icon: 'crosshair', tier: 'common', rule: { type: 'completed', threshold: 25 } },
  { key: 'streak-7', name: 'Week Warrior', description: 'Reach a 7-day streak', icon: 'calendar-check', tier: 'rare', rule: { type: 'streak', threshold: 7 } },
  { key: 'solved-50', name: 'Problem Crusher', description: 'Complete 50 questions', icon: 'swords', tier: 'rare', rule: { type: 'completed', threshold: 50 } },
  { key: 'points-500', name: 'Point Collector', description: 'Earn 500 points', icon: 'gem', tier: 'rare', rule: { type: 'points', threshold: 500 } },
  { key: 'perfect-7', name: 'Flawless Week', description: 'Finish 7 perfect days', icon: 'shield', tier: 'rare', rule: { type: 'perfectDays', threshold: 7 } },
  { key: 'streak-14', name: 'Fortnight Fighter', description: 'Reach a 14-day streak', icon: 'flame', tier: 'rare', rule: { type: 'streak', threshold: 14 } },
  { key: 'streak-30', name: 'Unstoppable', description: 'Reach a 30-day streak', icon: 'trophy', tier: 'epic', rule: { type: 'streak', threshold: 30 } },
  { key: 'solved-100', name: 'Centurion', description: 'Complete 100 questions', icon: 'crown', tier: 'epic', rule: { type: 'completed', threshold: 100 } },
  { key: 'points-1000', name: 'High Roller', description: 'Earn 1,000 points', icon: 'gem', tier: 'epic', rule: { type: 'points', threshold: 1000 } },
  { key: 'streak-100', name: 'Legend of the Streak', description: 'Reach a 100-day streak', icon: 'crown', tier: 'legendary', rule: { type: 'streak', threshold: 100 } },
];
const tierOf = (key) => (DEFAULT_BADGES.find((b) => b.key === key) || {}).tier || 'common';

async function ensureDefaultBadges() {
  for (const b of DEFAULT_BADGES) {
    await Badge.updateOne({ key: b.key }, { $setOnInsert: b }, { upsert: true });
  }
}

const metricsOf = (user, streak) => ({
  completed: user.totalCompleted || 0,
  points: user.totalPoints || 0,
  streak: streak ? streak.longest : 0,
  perfectDays: streak ? streak.perfectDays || 0 : 0,
});

/** Every achievement with the user's progress towards it (locked ones included). */
async function progressForUser(userId) {
  const [user, streak, badges, owned] = await Promise.all([
    User.findById(userId).lean(),
    Streak.findOne({ user: userId }).lean(),
    Badge.find().lean(),
    UserBadge.find({ user: userId }).lean(),
  ]);
  if (!user) return [];
  const m = metricsOf(user, streak);
  const mine = new Map(owned.map((o) => [String(o.badge), o]));
  const order = (k) => { const i = DEFAULT_BADGES.findIndex((b) => b.key === k); return i < 0 ? 999 : i; };
  return badges
    .map((b) => {
      const target = (b.rule && b.rule.threshold) || 0;
      const have = mine.get(String(b._id));
      const tier = tierOf(b.key);
      return {
        key: b.key, name: b.name, description: b.description, icon: b.icon, tier, xp: TIER_XP[tier],
        type: b.rule && b.rule.type, target, progress: Math.min((b.rule && m[b.rule.type]) || 0, target),
        unlocked: !!have, awardedAt: have ? have.awardedAt : null,
      };
    })
    .sort((a, b) => order(a.key) - order(b.key));
}

/** Evaluates all badge rules for a user and grants any newly earned ones. Returns the new badges. */
async function checkAndAward(userId) {
  const [user, streak, badges, owned] = await Promise.all([
    User.findById(userId).lean(),
    Streak.findOne({ user: userId }).lean(),
    Badge.find().lean(),
    UserBadge.find({ user: userId }).lean(),
  ]);
  if (!user) return [];
  const have = new Set(owned.map((o) => String(o.badge)));
  const metrics = metricsOf(user, streak);
  const earned = [];
  for (const b of badges) {
    if (have.has(String(b._id)) || !b.rule || metrics[b.rule.type] < b.rule.threshold) continue;
    try {
      await UserBadge.create({ user: userId, badge: b._id });
      earned.push(b);
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  return earned;
}

async function listForUser(userId) {
  const rows = await UserBadge.find({ user: userId }).populate('badge').sort({ awardedAt: -1 }).lean();
  return rows.filter((r) => r.badge).map((r) => ({ ...r.badge, awardedAt: r.awardedAt }));
}

module.exports = { ensureDefaultBadges, checkAndAward, listForUser, progressForUser, tierOf, TIER_XP, DEFAULT_BADGES };
