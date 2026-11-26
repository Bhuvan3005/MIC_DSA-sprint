const { Roadmap, RoadmapProgress, Completion, Question } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { serializeQuestion } = require('../services/questionSerializer');

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const allQuestionIds = (r) => [...new Set(r.sections.flatMap((s) => s.topics.flatMap((t) => t.questions.map(String))))];

/** Questions count as done if marked on the roadmap OR completed via a daily challenge. */
async function doneSet(userId, roadmap) {
  const ids = allQuestionIds(roadmap);
  const [prog, comps] = await Promise.all([
    RoadmapProgress.findOne({ user: userId, roadmap: roadmap._id }).lean(),
    Completion.find({ user: userId, voided: false, question: { $in: ids } }).select('question').lean(),
  ]);
  return new Set([...(prog ? prog.completedQuestions.map(String) : []), ...comps.map((c) => String(c.question))]);
}

async function uniqueSlug(title, ignoreId) {
  const base = slugify(title) || 'roadmap';
  let slug = base; let n = 1;
  while (await Roadmap.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) { n += 1; slug = `${base}-${n}`; }
  return slug;
}

async function assertQuestionsExist(sections) {
  const ids = [...new Set((sections || []).flatMap((s) => s.topics.flatMap((t) => t.questions)))];
  if (ids.length && (await Question.countDocuments({ _id: { $in: ids } })) !== ids.length) {
    throw new AppError(400, 'One or more questions in the roadmap do not exist', 'VALIDATION');
  }
}

// ---- Students ----
exports.list = asyncHandler(async (req, res) => {
  const roadmaps = await Roadmap.find({ published: true }).sort({ order: 1, createdAt: 1 }).lean();
  const items = [];
  for (const r of roadmaps) {
    const total = allQuestionIds(r).length;
    const done = (await doneSet(req.user._id, r));
    const completed = allQuestionIds(r).filter((id) => done.has(id)).length;
    items.push({
      id: r._id, slug: r.slug, title: r.title, description: r.description,
      sections: r.sections.length, total, completed, percent: total ? Math.round((completed / total) * 100) : 0,
    });
  }
  res.json({ success: true, items });
});

exports.get = asyncHandler(async (req, res) => {
  const r = await Roadmap.findOne({ _id: req.params.id, published: true })
    .populate({ path: 'sections.topics.questions', populate: { path: 'videoSolution', select: 'published' } }).lean();
  if (!r) throw new AppError(404, 'Roadmap not found', 'NOT_FOUND');
  const done = await doneSet(req.user._id, { ...r, sections: r.sections.map((s) => ({ ...s, topics: s.topics.map((t) => ({ ...t, questions: t.questions.map((q) => q._id) })) })) });
  res.json({
    success: true,
    roadmap: {
      id: r._id, title: r.title, description: r.description,
      sections: r.sections.map((s) => ({
        id: s._id, title: s.title,
        topics: s.topics.map((t) => ({
          id: t._id, title: t.title, description: t.description,
          questions: t.questions.filter(Boolean).map((q) => ({ ...serializeQuestion(q), completed: done.has(String(q._id)) })),
        })),
      })),
    },
  });
});

exports.progress = asyncHandler(async (req, res) => {
  const r = await Roadmap.findOne({ _id: req.params.id, published: true }).lean();
  if (!r) throw new AppError(404, 'Roadmap not found', 'NOT_FOUND');
  const ids = allQuestionIds(r);
  const done = await doneSet(req.user._id, r);
  const completed = ids.filter((id) => done.has(id));
  res.json({ success: true, progress: { total: ids.length, completed: completed.length, percent: ids.length ? Math.round((completed.length / ids.length) * 100) : 0, completedQuestions: completed } });
});

exports.setProgress = asyncHandler(async (req, res) => {
  const r = await Roadmap.findOne({ _id: req.params.id, published: true }).lean();
  if (!r) throw new AppError(404, 'Roadmap not found', 'NOT_FOUND');
  const { questionId, done } = req.body;
  if (!allQuestionIds(r).includes(questionId)) throw new AppError(400, 'Question is not part of this roadmap', 'VALIDATION');
  // Roadmap ticks are personal progress only: they never award points or affect streaks.
  await RoadmapProgress.updateOne(
    { user: req.user._id, roadmap: r._id },
    done ? { $addToSet: { completedQuestions: questionId } } : { $pull: { completedQuestions: questionId } },
    { upsert: true },
  );
  res.json({ success: true });
});

// ---- Admin / editor ----
exports.adminList = asyncHandler(async (_req, res) => {
  const items = await Roadmap.find().sort({ order: 1, createdAt: 1 }).lean();
  res.json({ success: true, items: items.map((r) => ({ ...r, id: r._id, questionCount: allQuestionIds(r).length })) });
});

exports.adminGet = asyncHandler(async (req, res) => {
  const r = await Roadmap.findById(req.params.id).populate('sections.topics.questions', 'title slug difficulty').lean();
  if (!r) throw new AppError(404, 'Roadmap not found', 'NOT_FOUND');
  res.json({ success: true, roadmap: r });
});

exports.create = asyncHandler(async (req, res) => {
  await assertQuestionsExist(req.body.sections);
  const r = await Roadmap.create({ ...req.body, slug: await uniqueSlug(req.body.title), createdBy: req.user._id });
  res.status(201).json({ success: true, roadmap: r });
});

exports.update = asyncHandler(async (req, res) => {
  const r = await Roadmap.findById(req.params.id);
  if (!r) throw new AppError(404, 'Roadmap not found', 'NOT_FOUND');
  if (req.body.sections) await assertQuestionsExist(req.body.sections);
  r.set(req.body);
  if (req.body.title) r.slug = await uniqueSlug(req.body.title, r._id);
  await r.save();
  res.json({ success: true, roadmap: r });
});

exports.remove = asyncHandler(async (req, res) => {
  const r = await Roadmap.findByIdAndDelete(req.params.id);
  if (!r) throw new AppError(404, 'Roadmap not found', 'NOT_FOUND');
  await RoadmapProgress.deleteMany({ roadmap: r._id });
  res.json({ success: true });
});
