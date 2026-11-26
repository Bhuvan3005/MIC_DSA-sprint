const { DateTime } = require('luxon');
const env = require('../config/env');

const tz = () => env.PLATFORM_TIMEZONE;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date key (YYYY-MM-DD) in the platform timezone. Always server-clock based. */
const todayKey = (now = new Date()) => DateTime.fromJSDate(now, { zone: tz() }).toFormat('yyyy-MM-dd');
const isValidDateKey = (s) => typeof s === 'string' && DATE_RE.test(s) && DateTime.fromISO(s).isValid;
const addDays = (key, n) => DateTime.fromISO(key, { zone: tz() }).plus({ days: n }).toFormat('yyyy-MM-dd');
const diffDays = (a, b) => Math.round(DateTime.fromISO(a, { zone: tz() }).diff(DateTime.fromISO(b, { zone: tz() }), 'days').days);

/** Start (as JS Date) of the current week (Mon) / month in platform tz. */
const startOfWeek = (now = new Date()) => DateTime.fromJSDate(now, { zone: tz() }).startOf('week').toJSDate();
const startOfMonth = (now = new Date()) => DateTime.fromJSDate(now, { zone: tz() }).startOf('month').toJSDate();

module.exports = { todayKey, isValidDateKey, addDays, diffDays, startOfWeek, startOfMonth };
