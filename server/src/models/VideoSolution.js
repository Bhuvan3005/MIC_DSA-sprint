const mongoose = require('mongoose');
const { DIFFICULTIES, TOPICS } = require('../config/constants');

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  startSeconds: { type: Number, required: true, min: 0 },
}, { _id: false });

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 4000, default: '' },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, unique: true }, // one solution video per question
  difficulty: { type: String, enum: DIFFICULTIES },
  topics: [{ type: String, enum: TOPICS }],
  cloudinaryPublicId: { type: String, required: true, unique: true },
  secureUrl: { type: String, required: true },
  thumbnailUrl: String,
  duration: { type: Number, default: 0 },
  bytes: Number,
  format: String,
  chapters: [chapterSchema],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  published: { type: Boolean, default: false, index: true },
}, { timestamps: true });

schema.index({ published: 1, createdAt: -1 });
schema.index({ title: 'text' });

module.exports = mongoose.model('VideoSolution', schema);
