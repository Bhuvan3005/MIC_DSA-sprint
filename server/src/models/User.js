const mongoose = require('mongoose');
const { ROLES } = require('../config/constants');
const { avatarUrl } = require('../utils/avatar');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT, index: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  college: { type: String, trim: true, maxlength: 120, index: true },
  graduationYear: { type: Number, min: 2000, max: 2100 },
  leetcodeUsername: { type: String, trim: true, maxlength: 40 },
  bio: { type: String, maxlength: 280, default: '' },
  // Denormalised counters: only ever mutated by the server scoring/completion services.
  totalPoints: { type: Number, default: 0, index: true },
  totalCompleted: { type: Number, default: 0 },
  completedByDifficulty: {
    Easy: { type: Number, default: 0 },
    Medium: { type: Number, default: 0 },
    Hard: { type: Number, default: 0 },
  },
  tokenVersion: { type: Number, default: 0 },
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },
  avatarVersion: { type: Number, default: 0 }, // 0 = no picture; otherwise a timestamp used as a cache-buster
  lastActiveAt: Date,
}, { timestamps: true });

userSchema.index({ name: 'text' });
userSchema.index({ college: 1, totalPoints: -1 });
userSchema.index({ totalPoints: -1, totalCompleted: -1 });
userSchema.index({ createdAt: -1 });

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    college: this.college,
    graduationYear: this.graduationYear,
    leetcodeUsername: this.leetcodeUsername,
    bio: this.bio,
    avatarUrl: avatarUrl(this._id, this.avatarVersion),
    totalPoints: this.totalPoints,
    totalCompleted: this.totalCompleted,
    completedByDifficulty: this.completedByDifficulty,
    createdAt: this.createdAt,
  };
};
userSchema.methods.toSelf = function toSelf() {
  return { ...this.toPublic(), email: this.email, role: this.role, status: this.status };
};

module.exports = mongoose.model('User', userSchema);
