const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  badge: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', required: true },
  awardedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ user: 1, badge: 1 }, { unique: true });
module.exports = mongoose.model('UserBadge', schema);
