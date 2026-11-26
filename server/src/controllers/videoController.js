const mongoose = require('mongoose');
const { VideoSolution, Question, Roadmap } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { parsePage, pageMeta, escapeRegex } = require('../utils/pagination');
const cloud = require('../services/cloudinaryService');

const publicShape = (v, q) => ({
  id: v._id, title: v.title, description: v.description, difficulty: v.difficulty, topics: v.topics,
  secureUrl: v.secureUrl, thumbnailUrl: v.thumbnailUrl, duration: v.duration, chapters: v.chapters,
  createdAt: v.createdAt,
  question: q ? { id: q._id, title: q.title, slug: q.slug, leetcodeUrl: q.leetcodeUrl, difficulty: q.difficulty, topics: q.topics, number: q.number } : undefined,
});

// ---- Students: published videos only ----
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, { defaultLimit: 12 });
  const { search, difficulty, topic, roadmap } = req.query;
  const filter = { published: true };
  if (difficulty) filter.difficulty = difficulty;
  if (topic) filter.topics = topic;
  if (roadmap) {
    const r = await Roadmap.findOne({ _id: roadmap, published: true }).lean();
    filter.questionId = { $in: r ? r.sections.flatMap((s) => s.topics.flatMap((t) => t.questions)) : [] };
  }
  if (search) {
    const qs = await Question.find({ title: new RegExp(escapeRegex(search), 'i') }).select('_id').lean();
    filter.$or = [{ title: new RegExp(escapeRegex(search), 'i') }, { questionId: { $in: qs.map((q) => q._id) } }];
  }
  const [rows, total] = await Promise.all([
    VideoSolution.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('questionId').lean(),
    VideoSolution.countDocuments(filter),
  ]);
  res.json({ success: true, items: rows.map((v) => publicShape(v, v.questionId)), pagination: pageMeta(page, limit, total) });
});

/** :id may be a video id or a LeetCode question slug (e.g. /videos/two-sum). Unpublished => 404. */
exports.get = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let video;
  if (mongoose.isValidObjectId(id)) {
    video = await VideoSolution.findOne({ _id: id, published: true }).populate('questionId').lean();
  } else {
    const q = await Question.findOne({ slug: id.toLowerCase() }).lean();
    if (q) video = await VideoSolution.findOne({ questionId: q._id, published: true }).populate('questionId').lean();
  }
  if (!video) throw new AppError(404, 'Video solution not found', 'NOT_FOUND');
  const q = video.questionId;
  const relatedQs = await Question.find({ _id: { $ne: q._id }, topics: { $in: q.topics }, videoSolution: { $ne: null } })
    .limit(6).select('title slug difficulty topics').lean();
  const published = await VideoSolution.find({ questionId: { $in: relatedQs.map((r) => r._id) }, published: true }).select('questionId').lean();
  const ok = new Set(published.map((p) => String(p.questionId)));
  res.json({
    success: true, video: publicShape(video, q),
    related: relatedQs.filter((r) => ok.has(String(r._id))).map((r) => ({ id: r._id, title: r.title, slug: r.slug, difficulty: r.difficulty, topics: r.topics })),
  });
});

// ---- Admin / editor ----
exports.signature = asyncHandler(async (_req, res) => {
  res.json({ success: true, upload: cloud.createUploadSignature() });
});

exports.config = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    config: { maxBytes: env.videoMaxBytes, maxMB: env.VIDEO_MAX_SIZE_MB, allowedFormats: env.videoAllowedFormats, cloudinaryConfigured: env.cloudinaryConfigured },
  });
});

exports.adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  if (req.query.topic) filter.topics = req.query.topic;
  if (req.query.search) filter.title = new RegExp(escapeRegex(req.query.search), 'i');
  const [rows, total] = await Promise.all([
    VideoSolution.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('questionId', 'title slug difficulty leetcodeUrl').populate('uploadedBy', 'name').lean(),
    VideoSolution.countDocuments(filter),
  ]);
  res.json({ success: true, items: rows.map((v) => ({ ...v, id: v._id, question: v.questionId })), pagination: pageMeta(page, limit, total) });
});

async function resolveAsset(body) {
  if (env.isTest) {
    // Tests run without Cloudinary credentials; trust the supplied metadata.
    return {
      secureUrl: body.secureUrl || `https://res.cloudinary.com/test/video/upload/${body.cloudinaryPublicId}.mp4`,
      duration: body.duration || 0, bytes: body.bytes, format: body.format, thumbnailUrl: body.thumbnailUrl,
    };
  }
  return cloud.inspectUploadedVideo(body.cloudinaryPublicId);
}

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const question = await Question.findById(b.questionId);
  if (!question) throw new AppError(400, 'The selected question does not exist', 'VALIDATION');
  if (await VideoSolution.exists({ questionId: question._id })) {
    throw new AppError(409, 'This question already has a video. Edit or replace it instead.', 'DUPLICATE');
  }
  const asset = await resolveAsset(b);
  const video = await VideoSolution.create({
    ...b, ...asset, difficulty: b.difficulty || question.difficulty,
    topics: b.topics && b.topics.length ? b.topics : question.topics, uploadedBy: req.user._id, published: !!b.published,
  });
  await Question.updateOne({ _id: question._id }, { videoSolution: video._id });
  res.status(201).json({ success: true, video });
});

exports.update = asyncHandler(async (req, res) => {
  const video = await VideoSolution.findById(req.params.id);
  if (!video) throw new AppError(404, 'Video not found', 'NOT_FOUND');
  const b = req.body;

  if (b.questionId && String(b.questionId) !== String(video.questionId)) {
    const target = await Question.findById(b.questionId);
    if (!target) throw new AppError(400, 'The selected question does not exist', 'VALIDATION');
    if (await VideoSolution.exists({ questionId: target._id })) throw new AppError(409, 'That question already has a video', 'DUPLICATE');
    await Question.updateOne({ _id: video.questionId }, { $unset: { videoSolution: 1 } });
    await Question.updateOne({ _id: target._id }, { videoSolution: video._id });
    video.questionId = target._id;
  }

  // Replacing the video file: verify the new asset first, then remove the old one.
  let oldPublicId = null;
  if (b.cloudinaryPublicId && b.cloudinaryPublicId !== video.cloudinaryPublicId) {
    const asset = await resolveAsset(b);
    oldPublicId = video.cloudinaryPublicId;
    video.set({ cloudinaryPublicId: b.cloudinaryPublicId, ...asset });
  }
  for (const k of ['title', 'description', 'difficulty', 'topics', 'chapters', 'published']) {
    if (b[k] !== undefined) video[k] = b[k];
  }
  await video.save();
  if (oldPublicId) await cloud.destroyVideo(oldPublicId);
  res.json({ success: true, video });
});

exports.setPublished = asyncHandler(async (req, res) => {
  const video = await VideoSolution.findByIdAndUpdate(req.params.id, { published: !!req.body.published }, { new: true });
  if (!video) throw new AppError(404, 'Video not found', 'NOT_FOUND');
  res.json({ success: true, video });
});

exports.remove = asyncHandler(async (req, res) => {
  const video = await VideoSolution.findById(req.params.id);
  if (!video) throw new AppError(404, 'Video not found', 'NOT_FOUND');
  await Question.updateOne({ _id: video.questionId }, { $unset: { videoSolution: 1 } });
  await cloud.destroyVideo(video.cloudinaryPublicId);
  await video.deleteOne();
  res.json({ success: true });
});
