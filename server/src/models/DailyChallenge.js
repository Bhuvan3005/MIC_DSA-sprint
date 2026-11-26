const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  // Platform-timezone date key, unique => one challenge per day.
  date: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  questions: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    validate: [(v) => v.length > 0 && new Set(v.map(String)).size === v.length, 'Questions must be unique and non-empty'],
  },
  published: { type: Boolean, default: true, index: true },
  note: { type: String, maxlength: 300 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ published: 1, date: -1 });
module.exports = mongoose.model('DailyChallenge', schema);
