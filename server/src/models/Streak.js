const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  current: { type: Number, default: 0 },
  longest: { type: Number, default: 0 },
  lastCompletedDate: String, // last day on which ALL daily questions were completed
  streakStartDate: String,
  activeDays: { type: Number, default: 0 }, // days with at least one completion
  perfectDays: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Streak', schema);
