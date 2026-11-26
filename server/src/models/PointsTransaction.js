const mongoose = require('mongoose');

// Append-only ledger. Reversals are new negative rows, never deletions.
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, required: true },
  type: {
    type: String, required: true,
    enum: ['FIRST_QUESTION', 'SECOND_QUESTION', 'EXTRA_QUESTION', 'BOTH_BONUS', 'STREAK_7', 'STREAK_30', 'REVERSAL', 'ADJUSTMENT'],
  },
  dedupeKey: { type: String, required: true, unique: true }, // a reward can only be granted once
  date: String,
  completion: { type: mongoose.Schema.Types.ObjectId, ref: 'Completion' },
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ user: 1, createdAt: -1 });
schema.index({ createdAt: -1, user: 1 });

module.exports = mongoose.model('PointsTransaction', schema);
