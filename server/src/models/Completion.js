const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyChallenge', required: true },
  date: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  order: { type: Number, enum: [1, 2, 3, 4, 5], required: true }, // nth completion of that day
  // Only SELF_REPORTED is produced today; verification adapters can upgrade the status later.
  verificationMethod: { type: String, enum: ['SELF_REPORTED', 'LEETCODE_PUBLIC', 'LEETCODE_OAUTH', 'EXTENSION', 'MANUAL'], default: 'SELF_REPORTED' },
  verificationStatus: { type: String, enum: ['self_reported', 'verified', 'rejected'], default: 'self_reported' },
  voided: { type: Boolean, default: false, index: true },
  voidReason: String,
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ user: 1, challenge: 1, question: 1 }, { unique: true }); // no duplicate completion
schema.index({ user: 1, date: -1 });
schema.index({ question: 1 });
schema.index({ date: 1 });

module.exports = mongoose.model('Completion', schema);
