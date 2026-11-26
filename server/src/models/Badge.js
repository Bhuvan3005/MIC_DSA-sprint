const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  icon: { type: String, default: 'award' },
  rule: {
    type: { type: String, enum: ['completed', 'streak', 'points', 'perfectDays'] },
    threshold: Number,
  },
}, { timestamps: true });

module.exports = mongoose.model('Badge', schema);
