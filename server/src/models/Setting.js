const mongoose = require('mongoose');
const { DEFAULT_SCORING, DAILY_QUESTION_COUNT } = require('../config/constants');

const schema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  scoring: {
    firstQuestion: { type: Number, default: DEFAULT_SCORING.firstQuestion, min: 0, max: 10000 },
    secondQuestion: { type: Number, default: DEFAULT_SCORING.secondQuestion, min: 0, max: 10000 },
    bothBonus: { type: Number, default: DEFAULT_SCORING.bothBonus, min: 0, max: 10000 },
    streak7: { type: Number, default: DEFAULT_SCORING.streak7, min: 0, max: 10000 },
    streak30: { type: Number, default: DEFAULT_SCORING.streak30, min: 0, max: 10000 },
  },
  dailyQuestionCount: { type: Number, default: DAILY_QUESTION_COUNT, min: 1, max: 5 },
}, { timestamps: true });

module.exports = mongoose.model('Setting', schema);
