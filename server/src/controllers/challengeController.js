const { DailyChallenge, Completion, Question } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { todayKey, isValidDateKey } = require('../utils/dates');
const { parsePage, pageMeta } = require('../utils/pagination');
const { serializeQuestions } = require('../services/questionSerializer');
const { getSettings } = require('../services/settingsService');

const populateQuestions = { path: 'questions', populate: { path: 'videoSolution', select: 'published' } };

async function shapeForStudent(challenge, userId) {
  let done = new Set();
  if (userId) {
    const rows = await Completion.find({ user: userId, challenge: challenge._id, voided: false }).lean();
    done = new Set(rows.map((c) => String(c.question)));
  }
  const questions = serializeQuestions(challenge.questions).map((q) => ({ ...q, completed: done.has(String(q.id)) }));
  const completedCount = questions.filter((q) => q.completed).length;
  return {
    id: challenge._id, date: challenge.date, note: challenge.note, questions,
    completedCount, total: questions.length, perfect: questions.length > 0 && completedCount === questions.length,
  };
}

exports.today = asyncHandler(async (req, res) => {
  const date = todayKey();
  const c = await DailyChallenge.findOne({ date, published: true }).populate(populateQuestions).lean();
  res.json({ success: true, date, challenge: c ? await shapeForStudent(c, req.user._id) : null });
});

exports.history = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, { defaultLimit: 10, maxLimit: 50 });
  const filter = { published: true, date: { $lte: todayKey() } };
  const [rows, total] = await Promise.all([
    DailyChallenge.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate(populateQuestions).lean(),
    DailyChallenge.countDocuments(filter),
  ]);
  const items = await Promise.all(rows.map((c) => shapeForStudent(c, req.user._id)));
  res.json({ success: true, items, pagination: pageMeta(page, limit, total) });
});

exports.byDate = asyncHandler(async (req, res) => {
  const { date } = req.params;
  if (!isValidDateKey(date)) throw new AppError(400, 'Date must be YYYY-MM-DD', 'VALIDATION');
  // Students never see future (scheduled) challenges.
  if (date > todayKey()) throw new AppError(404, 'No challenge for that date', 'NOT_FOUND');
  const c = await DailyChallenge.findOne({ date, published: true }).populate(populateQuestions).lean();
  if (!c) throw new AppError(404, 'No challenge for that date', 'NOT_FOUND');
  res.json({ success: true, challenge: await shapeForStudent(c, req.user._id) });
});

// ---- Admin / editor ----
async function validateQuestions(ids, expectedCount) {
  if (new Set(ids).size !== ids.length) throw new AppError(400, 'The same question cannot be added twice to one day', 'DUPLICATE_QUESTION');
  if (ids.length !== expectedCount) throw new AppError(400, `A daily challenge must contain exactly ${expectedCount} questions`, 'VALIDATION');
  const found = await Question.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) throw new AppError(400, 'One or more questions do not exist', 'VALIDATION');
}

const adminPopulate = { path: 'questions', select: 'title slug difficulty topics leetcodeUrl number recommendedMinutes featured videoSolution', populate: { path: 'videoSolution', select: 'published' } };

exports.adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, { defaultLimit: 15 });
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }
  const [rows, total] = await Promise.all([
    DailyChallenge.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate(adminPopulate).lean(),
    DailyChallenge.countDocuments(filter),
  ]);
  const counts = await Completion.aggregate([
    { $match: { challenge: { $in: rows.map((r) => r._id) }, voided: false } },
    { $group: { _id: '$challenge', n: { $sum: 1 } } },
  ]);
  const cMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const today = todayKey();
  res.json({
    success: true,
    items: rows.map((c) => ({
      id: c._id, date: c.date, published: c.published, note: c.note,
      status: !c.published ? 'unpublished' : c.date > today ? 'scheduled' : c.date === today ? 'live' : 'past',
      completions: cMap.get(String(c._id)) || 0,
      questions: serializeQuestions(c.questions),
    })),
    pagination: pageMeta(page, limit, total),
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { date, questions, published = true, note } = req.body;
  if (date < todayKey()) throw new AppError(400, 'Challenges cannot be created for past dates', 'VALIDATION');
  if (!isValidDateKey(date)) throw new AppError(400, 'Invalid date', 'VALIDATION');
  const settings = await getSettings();
  await validateQuestions(questions, settings.dailyQuestionCount);
  const c = await DailyChallenge.create({ date, questions, published, note, createdBy: req.user._id });
  await c.populate(adminPopulate);
  res.status(201).json({ success: true, challenge: c });
});

exports.update = asyncHandler(async (req, res) => {
  const c = await DailyChallenge.findById(req.params.id);
  if (!c) throw new AppError(404, 'Challenge not found', 'NOT_FOUND');
  const hasCompletions = await Completion.exists({ challenge: c._id });
  const { questions, date, published, note } = req.body;
  if ((questions || (date && date !== c.date)) && hasCompletions) {
    throw new AppError(409, 'Students have already completed this challenge. You can only unpublish it or edit the note.', 'LOCKED');
  }
  if (questions) {
    const settings = await getSettings();
    await validateQuestions(questions, settings.dailyQuestionCount);
    c.questions = questions;
  }
  if (date && date !== c.date) {
    if (!isValidDateKey(date) || date < todayKey()) throw new AppError(400, 'Invalid or past date', 'VALIDATION');
    c.date = date;
  }
  if (published !== undefined) c.published = published;
  if (note !== undefined) c.note = note;
  await c.save();
  await c.populate(adminPopulate);
  res.json({ success: true, challenge: c });
});

exports.remove = asyncHandler(async (req, res) => {
  const c = await DailyChallenge.findById(req.params.id);
  if (!c) throw new AppError(404, 'Challenge not found', 'NOT_FOUND');
  if (await Completion.exists({ challenge: c._id })) {
    throw new AppError(409, 'This challenge has student completions and cannot be deleted. Unpublish it instead.', 'LOCKED');
  }
  await c.deleteOne();
  res.json({ success: true });
});

/** Preview exactly what students would see for this challenge. */
exports.preview = asyncHandler(async (req, res) => {
  const c = await DailyChallenge.findById(req.params.id).populate(populateQuestions).lean();
  if (!c) throw new AppError(404, 'Challenge not found', 'NOT_FOUND');
  res.json({ success: true, challenge: await shapeForStudent(c, null) });
});
