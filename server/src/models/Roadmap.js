const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 500, default: '' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
});
const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  topics: [topicSchema],
});

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true },
  description: { type: String, maxlength: 1000, default: '' },
  sections: [sectionSchema], // array order is the display order
  published: { type: Boolean, default: false, index: true },
  order: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ published: 1, order: 1 });
module.exports = mongoose.model('Roadmap', schema);
