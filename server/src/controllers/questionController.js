const mongoose = require('mongoose');
const { Question, DailyChallenge, VideoSolution, Roadmap } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePage, pageMeta, escapeRegex } = require('../utils/pagination');
const { serializeQuestion } = require('../services/questionSerializer');
const { destroyVideo } = require('../services/cloudinaryService');

function buildFilter(q) {
  const f = {};
  if (q.difficulty) f.difficulty = q.difficulty;
  if (q.topic) f.topics = q.topic;
  if (q.featured) f.featured = q.featured === 'true';
  if (q.hasVideo) f.videoSolution = q.hasVideo === 'true' ? { $ne: null } : null;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    const n = Number(q.search);
    f.$or = [{ title: rx }, { slug: rx }, ...(Number.isInteger(n) ? [{ number: n }] : [])];
  }
  return f;
}

async function list(req, res) {
  const { page, limit, skip } = parsePage(req.query);
  const filter = buildFilter(req.query);
  const [items, total] = await Promise.all([
    Question.find(filter).sort({ number: 1, createdAt: -1 }).skip(skip).limit(limit)
      .populate('videoSolution', 'published').lean(),
    Question.countDocuments(filter),
  ]);
  res.json({ success: true, items: items.map(serializeQuestion), pagination: pageMeta(page, limit, total) });
}
exports.list = asyncHandler(list);

exports.get = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const q = await Question.findOne(mongoose.isValidObjectId(id) ? { _id: id } : { slug: id.toLowerCase() })
    .populate('videoSolution', 'published').lean();
  if (!q) throw new AppError(404, 'Question not found', 'NOT_FOUND');
  res.json({ success: true, question: serializeQuestion(q) });
});

// ---- Admin / editor ----
const withLeetcodeUrl = (b) => ({ ...b, leetcodeUrl: b.leetcodeUrl || `https://leetcode.com/problems/${b.slug}/` });

function assertLeetcodeUrl(url) {
  let u;
  try { u = new URL(url); } catch { throw new AppError(400, 'Invalid LeetCode URL', 'VALIDATION'); }
  if (!['leetcode.com', 'www.leetcode.com', 'leetcode.cn'].includes(u.hostname) || u.protocol !== 'https:') {
    throw new AppError(400, 'LeetCode URL must be an https://leetcode.com link', 'VALIDATION');
  }
}

exports.adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const filter = buildFilter(req.query);
  const [items, total] = await Promise.all([
    Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('videoSolution', 'title published').lean(),
    Question.countDocuments(filter),
  ]);
  res.json({ success: true, items: items.map((q) => ({ ...serializeQuestion(q), video: q.videoSolution || null })), pagination: pageMeta(page, limit, total) });
});

exports.create = asyncHandler(async (req, res) => {
  const body = withLeetcodeUrl(req.body);
  assertLeetcodeUrl(body.leetcodeUrl);
  const q = await Question.create({ ...body, createdBy: req.user._id });
  res.status(201).json({ success: true, question: serializeQuestion(q) });
});

exports.update = asyncHandler(async (req, res) => {
  const body = withLeetcodeUrl(req.body);
  assertLeetcodeUrl(body.leetcodeUrl);
  const q = await Question.findById(req.params.id);
  if (!q) throw new AppError(404, 'Question not found', 'NOT_FOUND');
  q.set({ ...body, number: body.number ?? undefined });
  await q.save();
  await q.populate('videoSolution', 'published');
  res.json({ success: true, question: serializeQuestion(q) });
});

exports.toggleFeatured = asyncHandler(async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (!q) throw new AppError(404, 'Question not found', 'NOT_FOUND');
  q.featured = !q.featured;
  await q.save();
  res.json({ success: true, featured: q.featured });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const q = await Question.findById(id);
  if (!q) throw new AppError(404, 'Question not found', 'NOT_FOUND');
  const [inChallenge, inRoadmap] = await Promise.all([
    DailyChallenge.exists({ questions: id }),
    Roadmap.exists({ 'sections.topics.questions': id }),
  ]);
  if (inChallenge) throw new AppError(409, 'Question is used in a daily challenge. Remove it from the challenge first.', 'IN_USE');
  if (inRoadmap) throw new AppError(409, 'Question is used in a roadmap. Remove it from the roadmap first.', 'IN_USE');
  const video = await VideoSolution.findOne({ questionId: id });
  if (video) { await destroyVideo(video.cloudinaryPublicId); await video.deleteOne(); }
  await q.deleteOne();
  res.json({ success: true });
});
