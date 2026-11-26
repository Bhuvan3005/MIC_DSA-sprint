const mongoose = require('mongoose');
const { User, DailyChallenge, Completion, Roadmap, RoadmapProgress, Avatar } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { todayKey, addDays } = require('../utils/dates');
const streakService = require('../services/streakService');
const badgeService = require('../services/badgeService');
const { globalRank } = require('../services/leaderboardService');
const { serializeQuestions } = require('../services/questionSerializer');

exports.getMe = asyncHandler(async (req, res) => res.json({ success: true, user: req.user.toSelf() }));

exports.updateMe = asyncHandler(async (req, res) => {
  const patch = { ...req.body };
  if (patch.leetcodeUsername && patch.leetcodeUsername !== req.user.leetcodeUsername) {
    await require('./authController').assertLeetcodeUser(patch.leetcodeUsername);
  }
  req.user.set(patch); // strict schema guarantees only profile fields reach here
  await req.user.save();
  res.json({ success: true, user: req.user.toSelf() });
});

/** Public profile: never exposes email, role or status. */
exports.getPublicProfile = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const user = await User.findById(req.params.id);
  if (!user || user.status !== 'active') throw new AppError(404, 'Student not found', 'NOT_FOUND');
  const [streak, heatmap, badges, rank, monthly] = await Promise.all([
    streakService.getSummary(user._id),
    streakService.getHeatmap(user._id),
    badgeService.listForUser(user._id),
    globalRank(user._id),
    streakService.monthlyActiveDays(user._id),
  ]);
  const pub = user.toPublic();
  res.json({
    success: true,
    profile: {
      ...pub,
      leetcodeProfileUrl: user.leetcodeUsername ? `https://leetcode.com/u/${encodeURIComponent(user.leetcodeUsername)}/` : null,
      // Counts are derived from self-reported completions of CodeSprint daily challenges.
      breakdownIsSelfReported: true,
      streak: { ...streak, monthlyActiveDays: monthly },
      heatmap, badges, rank,
    },
  });
});

/** One call powering the student dashboard. */
exports.dashboard = asyncHandler(async (req, res) => {
  const user = req.user;
  const today = todayKey();
  const [streak, rank, badges, heatmapWeek, challenge, monthly, roadmaps] = await Promise.all([
    streakService.getSummary(user._id),
    globalRank(user._id),
    badgeService.listForUser(user._id),
    streakService.getHeatmap(user._id, 7),
    DailyChallenge.findOne({ date: today, published: true }).populate({ path: 'questions', populate: { path: 'videoSolution', select: 'published' } }).lean(),
    streakService.monthlyActiveDays(user._id),
    Roadmap.find({ published: true }).sort({ order: 1 }).lean(),
  ]);

  let todayChallenge = null;
  if (challenge) {
    const done = await Completion.find({ user: user._id, challenge: challenge._id, voided: false }).lean();
    const doneSet = new Set(done.map((c) => String(c.question)));
    todayChallenge = {
      date: challenge.date, note: challenge.note,
      questions: serializeQuestions(challenge.questions).map((q) => ({ ...q, completed: doneSet.has(String(q.id)) })),
    };
  }

  const week = [];
  const byDate = new Map(heatmapWeek.map((h) => [h.date, h.count]));
  for (let i = 6; i >= 0; i -= 1) {
    const d = addDays(today, -i);
    week.push({ date: d, count: byDate.get(d) || 0 });
  }

  const progress = await RoadmapProgress.find({ user: user._id }).lean();
  const pMap = new Map(progress.map((p) => [String(p.roadmap), new Set(p.completedQuestions.map(String))]));
  const roadmapSummary = roadmaps.map((r) => {
    const qs = new Set(r.sections.flatMap((s) => s.topics.flatMap((t) => t.questions.map(String))));
    const done = [...qs].filter((q) => (pMap.get(String(r._id)) || new Set()).has(q)).length;
    return { id: r._id, title: r.title, total: qs.size, done, percent: qs.size ? Math.round((done / qs.size) * 100) : 0 };
  });
  const totalQ = roadmapSummary.reduce((a, r) => a + r.total, 0);
  const doneQ = roadmapSummary.reduce((a, r) => a + r.done, 0);

  res.json({
    success: true,
    dashboard: {
      user: user.toSelf(), streak: { ...streak, monthlyActiveDays: monthly },
      rank, todayChallenge, weeklyActivity: week, badges: badges.slice(0, 6),
      roadmapCompletion: { percent: totalQ ? Math.round((doneQ / totalQ) * 100) : 0, roadmaps: roadmapSummary },
    },
  });
});

exports.myHeatmap = asyncHandler(async (req, res) => {
  const [heatmap, streak, monthly] = await Promise.all([
    streakService.getHeatmap(req.user._id), streakService.getSummary(req.user._id), streakService.monthlyActiveDays(req.user._id),
  ]);
  res.json({ success: true, heatmap, streak: { ...streak, monthlyActiveDays: monthly } });
});

/** All achievements with progress, for the dashboard panel. */
exports.achievements = asyncHandler(async (req, res) => {
  const items = await badgeService.progressForUser(req.user._id);
  const got = items.filter((i) => i.unlocked);
  res.json({ success: true, items, unlocked: got.length, total: items.length, xp: got.reduce((a, i) => a + i.xp, 0) });
});

// ---- Profile picture ----
const MAX_AVATAR_BYTES = 64 * 1024;
/** Confirms the bytes really are the image type claimed (the data-URL prefix alone can be faked). */
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

exports.setAvatar = asyncHandler(async (req, res) => {
  const buf = Buffer.from(req.body.image.slice(req.body.image.indexOf(',') + 1), 'base64');
  if (buf.length > MAX_AVATAR_BYTES) throw new AppError(413, 'Image is too large. Please choose a smaller picture.', 'TOO_LARGE');
  const type = sniff(buf);
  if (!type) throw new AppError(400, 'That file is not a valid PNG, JPEG or WebP image.', 'VALIDATION');
  await Avatar.updateOne({ user: req.user._id }, { $set: { contentType: type, data: buf } }, { upsert: true });
  await User.updateOne({ _id: req.user._id }, { avatarVersion: Date.now() });
  res.json({ success: true, user: (await User.findById(req.user._id)).toSelf() });
});

exports.removeAvatar = asyncHandler(async (req, res) => {
  await Avatar.deleteOne({ user: req.user._id });
  await User.updateOne({ _id: req.user._id }, { avatarVersion: 0 });
  res.json({ success: true, user: (await User.findById(req.user._id)).toSelf() });
});

/** Public image endpoint. URLs carry ?v=<timestamp>, so responses can be cached for a year. */
exports.getAvatar = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'No picture', 'NOT_FOUND');
  const [user, img] = await Promise.all([User.findById(req.params.id).select('status'), Avatar.findOne({ user: req.params.id })]);
  if (!user || user.status !== 'active' || !img) throw new AppError(404, 'No picture', 'NOT_FOUND');
  res.set({ 'Content-Type': img.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Content-Type-Options': 'nosniff' });
  res.send(img.data);
});
