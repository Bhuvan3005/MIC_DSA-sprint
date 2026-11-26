const mongoose = require('mongoose');
const { DIFFICULTIES, TOPICS } = require('../config/constants');

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
  leetcodeUrl: { type: String, required: true },
  number: { type: Number, min: 1 },
  difficulty: { type: String, enum: DIFFICULTIES, required: true, index: true },
  topics: [{ type: String, enum: TOPICS }],
  tags: [{ type: String, trim: true, maxlength: 40 }],
  description: { type: String, maxlength: 2000, default: '' },
  recommendedMinutes: { type: Number, min: 1, max: 600, default: 30 },
  featured: { type: Boolean, default: false, index: true },
  videoSolution: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoSolution' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

questionSchema.index({ topics: 1, difficulty: 1 });
questionSchema.index({ title: 'text', slug: 'text' });
questionSchema.index({ number: 1 }, { sparse: true });

module.exports = mongoose.model('Question', questionSchema);
