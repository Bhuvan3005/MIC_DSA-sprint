const asyncHandler = require('../utils/asyncHandler');
const completionService = require('../services/completionService');

exports.create = asyncHandler(async (req, res) => {
  const result = await completionService.recordCompletion(req.user, req.body.questionId);
  res.status(201).json({ success: true, ...result });
});

exports.mine = asyncHandler(async (req, res) => {
  const items = await completionService.listMine(req.user._id, { limit: Math.min(Number(req.query.limit) || 50, 200) });
  res.json({ success: true, items });
});
