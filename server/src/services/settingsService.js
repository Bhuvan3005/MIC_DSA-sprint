const { Setting } = require('../models');

async function getSettings() {
  const doc = await Setting.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc;
}

async function updateSettings(patch) {
  const doc = await getSettings();
  if (patch.scoring) Object.assign(doc.scoring, patch.scoring);
  if (patch.dailyQuestionCount) doc.dailyQuestionCount = patch.dailyQuestionCount;
  await doc.save();
  return doc;
}

module.exports = { getSettings, updateSettings };
