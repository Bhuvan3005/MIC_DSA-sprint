const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { User } = require('../models');
const models = require('../models');
const { ensureDefaultBadges } = require('../services/badgeService');
const { getSettings } = require('../services/settingsService');

/** Idempotent startup work: indexes, default settings/badges and the first admin account. */
async function bootstrap() {
  await Promise.all(Object.values(models).map((m) => m.init()));
  await getSettings();
  await ensureDefaultBadges();
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const email = env.ADMIN_EMAIL.toLowerCase();
    if (!(await User.exists({ email }))) {
      await User.create({
        name: 'CodeSprint Admin', email, role: 'ADMIN', college: 'Other', graduationYear: 2030,
        passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
      });
      console.log(`Created initial admin account for ${email}`);
    }
  }
}

module.exports = { bootstrap };
