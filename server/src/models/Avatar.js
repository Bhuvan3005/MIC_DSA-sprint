const mongoose = require('mongoose');

// Profile pictures live in their own collection so user queries and leaderboard aggregations never carry image bytes.
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  contentType: { type: String, enum: ['image/png', 'image/jpeg', 'image/webp'], required: true },
  data: { type: Buffer, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Avatar', schema);
