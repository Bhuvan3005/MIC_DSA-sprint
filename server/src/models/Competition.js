const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['weekly', 'monthly', 'custom'], required: true },
  startsAt: { type: Date, required: true },
  endsAt: Date, // set when closed or reset
  active: { type: Boolean, default: true },
  // Standings frozen when a period closes, so history survives resets.
  finalStandings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String, college: String, points: Number, rank: Number,
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ type: 1, active: 1 });
schema.index({ startsAt: -1 });

module.exports = mongoose.model('Competition', schema);
