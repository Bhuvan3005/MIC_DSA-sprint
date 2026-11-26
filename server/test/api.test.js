require('dotenv').config({ quiet: true });
const ATLAS_URI = process.env.MONGODB_URI;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-123456';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://placeholder'; // app config only; tests connect explicitly below

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcryptjs');

let app; let M; let dates;
// Stubbed LeetCode: usernames starting with "ghost" don't exist; everyone else has accepted submissions for `lcSolved` slugs, made now.
const lcSolved = new Set(['two-sum', 'add-two-numbers', 'median-of-two-sorted-arrays', 'valid-parentheses']);
const lcFetcher = async (username) => ({
  exists: !username.startsWith('ghost'),
  submissions: [...lcSolved].map((titleSlug) => ({ title: titleSlug, titleSlug, timestamp: String(Math.floor(Date.now() / 1000)) })),
});
const H = { 'X-Requested-With': 'codesprint' };

// Cookie-carrying agent helper
function agent() {
  const a = request.agent(app);
  const wrap = (m) => (url) => a[m](url).set(H);
  return { get: wrap('get'), post: wrap('post'), put: wrap('put'), patch: wrap('patch'), delete: wrap('delete') };
}

before(async () => {
  // Dedicated throwaway database on the Atlas cluster: dropped before and after the run.
  const u = new URL(ATLAS_URI.replace('mongodb+srv://', 'https://'));
  const uri = ATLAS_URI.replace(/\/[^/?]*(\?|$)/, '/codesprint_test$1');
  assert.ok(u.host && uri.includes('/codesprint_test'));
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  M = require('../src/models');
  dates = require('../src/utils/dates');
  const { bootstrap } = require('../src/utils/bootstrap');
  await bootstrap();
  require('../src/services/verification').leetcodePublic.setFetcher(lcFetcher);
  app = require('../src/app').createApp();
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const reg = (n, extra = {}) => ({
  name: `Student ${n}`, email: `s${n}@test.dev`, password: 'Passw0rd!x', college: 'IIT Bombay', graduationYear: 2027, leetcodeUsername: `lc_${n}`, ...extra,
});

async function makeStaff(role, email) {
  await M.User.create({ name: role, email, role, passwordHash: await bcrypt.hash('Passw0rd!x', 4), college: 'Other', graduationYear: 2030 });
  const a = agent();
  const r = await a.post('/api/auth/login').send({ email, password: 'Passw0rd!x' });
  assert.equal(r.status, 200);
  return a;
}

test('registration forces STUDENT role and rejects privilege fields', async () => {
  const a = agent();
  const bad = await a.post('/api/auth/register').send({ ...reg(1), role: 'ADMIN' });
  assert.equal(bad.status, 400);
  const ok = await a.post('/api/auth/register').send(reg(1));
  assert.equal(ok.status, 201);
  assert.equal(ok.body.user.role, 'STUDENT');
  assert.equal(ok.body.user.passwordHash, undefined);
  const dup = await agent().post('/api/auth/register').send(reg(1));
  assert.equal(dup.status, 409);
  const stored = await M.User.findOne({ email: 's1@test.dev' }).select('+passwordHash');
  assert.notEqual(stored.passwordHash, 'Passw0rd!x');
  assert.ok(await bcrypt.compare('Passw0rd!x', stored.passwordHash));
});

test('weak password and missing CSRF header are rejected; login/logout/me work', async () => {
  const weak = await agent().post('/api/auth/register').send(reg(2, { password: 'short' }));
  assert.equal(weak.status, 400);
  const noHeader = await request(app).post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' });
  assert.equal(noHeader.status, 403);
  const a = agent();
  assert.equal((await a.post('/api/auth/login').send({ email: 's1@test.dev', password: 'wrong-pass1' })).status, 401);
  assert.equal((await a.post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' })).status, 200);
  assert.equal((await a.get('/api/auth/me')).body.user.email, 's1@test.dev');
  await a.post('/api/auth/logout');
  assert.equal((await a.get('/api/auth/me')).status, 401);
});

test('students cannot reach admin routes; unauthenticated gets 401', async () => {
  const a = agent();
  await a.post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' });
  assert.equal((await a.get('/api/admin/overview')).status, 403);
  assert.equal((await a.post('/api/admin/questions').send({})).status, 403);
  assert.equal((await a.put('/api/admin/users/' + new mongoose.Types.ObjectId() + '/role').send({ role: 'EDITOR' })).status, 403);
  assert.equal((await agent().get('/api/admin/overview')).status, 401);
  assert.equal((await agent().get('/api/challenges/today')).status, 401);
});

let admin; let editor; const qs = [];

test('admin question CRUD, search and filters', async () => {
  admin = await makeStaff('ADMIN', 'admin@test.dev');
  editor = await makeStaff('EDITOR', 'editor@test.dev');
  const defs = [
    { title: 'Two Sum', slug: 'two-sum', number: 1, difficulty: 'Easy', topics: ['Arrays', 'Hashing'] },
    { title: 'Add Two Numbers', slug: 'add-two-numbers', number: 2, difficulty: 'Medium', topics: ['Linked Lists'] },
    { title: 'Median of Two Sorted Arrays', slug: 'median-of-two-sorted-arrays', number: 4, difficulty: 'Hard', topics: ['Binary Search'] },
    { title: 'Valid Parentheses', slug: 'valid-parentheses', number: 20, difficulty: 'Easy', topics: ['Stacks'] },
  ];
  for (const d of defs) {
    const r = await editor.post('/api/admin/questions').send(d);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    qs.push(r.body.question);
  }
  assert.equal(qs[0].leetcodeUrl, 'https://leetcode.com/problems/two-sum/');
  assert.equal((await admin.post('/api/admin/questions').send(defs[0])).status, 409); // duplicate slug
  assert.equal((await admin.post('/api/admin/questions').send({ ...defs[0], slug: 'x', leetcodeUrl: 'https://evil.com/a' })).status, 400);
  assert.equal((await admin.post('/api/admin/questions').send({ ...defs[0], slug: 'y', topics: ['Magic'] })).status, 400);
  const list = await admin.get('/api/admin/questions?difficulty=Easy');
  assert.equal(list.body.items.length, 2);
  assert.equal((await admin.get('/api/admin/questions?search=median')).body.items.length, 1);
  assert.equal((await admin.get('/api/admin/questions?topic=Stacks')).body.items.length, 1);
  const upd = await admin.put(`/api/admin/questions/${qs[3].id}`).send({ title: 'Valid Parentheses!', slug: 'valid-parentheses', difficulty: 'Easy', topics: ['Stacks', 'Strings'] });
  assert.equal(upd.status, 200);
  assert.equal((await admin.patch(`/api/admin/questions/${qs[3].id}/featured`)).body.featured, true);
});

let todayChallenge;
test('challenge validation: exactly two, unique, no duplicate date, no past date', async () => {
  const today = dates.todayKey();
  const tomorrow = dates.addDays(today, 1);
  assert.equal((await admin.post('/api/admin/challenges').send({ date: today, questions: [qs[0].id] })).status, 400);
  assert.equal((await admin.post('/api/admin/challenges').send({ date: today, questions: [qs[0].id, qs[0].id] })).status, 400);
  assert.equal((await admin.post('/api/admin/challenges').send({ date: dates.addDays(today, -2), questions: [qs[0].id, qs[1].id] })).status, 400);
  const ok = await editor.post('/api/admin/challenges').send({ date: today, questions: [qs[0].id, qs[1].id] });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  todayChallenge = ok.body.challenge;
  assert.equal((await admin.post('/api/admin/challenges').send({ date: today, questions: [qs[2].id, qs[3].id] })).status, 409);
  const sched = await admin.post('/api/admin/challenges').send({ date: tomorrow, questions: [qs[2].id, qs[3].id] });
  assert.equal(sched.status, 201);
  const list = await admin.get('/api/admin/challenges');
  assert.deepEqual(list.body.items.map((c) => c.status).sort(), ['live', 'scheduled']);
  const prev = await admin.get(`/api/admin/challenges/${todayChallenge._id}/preview`);
  assert.equal(prev.body.challenge.questions.length, 2);
  // Question in use cannot be deleted
  assert.equal((await admin.delete(`/api/admin/questions/${qs[0].id}`)).status, 409);
});

test('student sees today only, scheduled challenges are hidden', async () => {
  const a = agent();
  await a.post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' });
  const t = await a.get('/api/challenges/today');
  assert.equal(t.body.challenge.questions.length, 2);
  assert.equal(t.body.challenge.questions[0].completed, false);
  assert.equal((await a.get(`/api/challenges/${dates.addDays(dates.todayKey(), 1)}`)).status, 404);
  assert.equal((await a.get(`/api/challenges/${dates.todayKey()}`)).status, 200);
  assert.equal((await a.get('/api/challenges/not-a-date')).status, 400);
});

test('completion flow: points, duplicates, bonus, streak, badges', async () => {
  const a = agent();
  await a.post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' });
  const notAssigned = await a.post('/api/completions').send({ questionId: qs[2].id });
  assert.equal(notAssigned.status, 400);
  const c1 = await a.post('/api/completions').send({ questionId: qs[0].id });
  assert.equal(c1.status, 201);
  assert.equal(c1.body.pointsEarned, 10);
  assert.equal(c1.body.perfectDay, false);
  assert.equal(c1.body.completion.verificationStatus, 'verified');
  const dup = await a.post('/api/completions').send({ questionId: qs[0].id });
  assert.equal(dup.status, 409);
  const c2 = await a.post('/api/completions').send({ questionId: qs[1].id });
  assert.equal(c2.body.pointsEarned, 20); // 15 + 5 bonus
  assert.equal(c2.body.perfectDay, true);
  assert.equal(c2.body.totalPoints, 30);
  assert.equal(c2.body.streak.current, 1);
  // concurrent duplicate submissions grant points once
  const b = agent();
  await b.post('/api/auth/register').send(reg(3));
  const race = await Promise.all([1, 2, 3, 4].map(() => b.post('/api/completions').send({ questionId: qs[0].id })));
  assert.equal(race.filter((r) => r.status === 201).length, 1);
  const u3 = await M.User.findOne({ email: 's3@test.dev' });
  assert.equal(u3.totalPoints, 10);
  assert.equal(await M.PointsTransaction.countDocuments({ user: u3._id }), 1);
  const me = await a.get('/api/users/me/dashboard');
  assert.equal(me.body.dashboard.todayChallenge.questions.every((q) => q.completed), true);
  assert.equal(me.body.dashboard.user.totalPoints, 30);
  assert.equal(me.body.dashboard.rank, 1);
  assert.ok(me.body.dashboard.badges.length >= 2);
  // locked challenge: cannot swap questions or delete after completions
  assert.equal((await admin.put(`/api/admin/challenges/${todayChallenge._id}`).send({ questions: [qs[2].id, qs[3].id] })).status, 409);
  assert.equal((await admin.delete(`/api/admin/challenges/${todayChallenge._id}`)).status, 409);
});

test('streak maths: consecutive days extend, gaps reset, 7-day milestone pays once', async () => {
  const streak = require('../src/services/streakService');
  const u = await M.User.create({ name: 'Streaky', email: 'streaky@test.dev', leetcodeUsername: 'streaky_lc', passwordHash: 'x', college: 'IIT Delhi', graduationYear: 2026 });
  const day = (n) => dates.addDays('2030-01-01', n);
  for (let i = 0; i < 3; i += 1) await streak.applyPerfectDay(u._id, day(i));
  let s = await M.Streak.findOne({ user: u._id });
  assert.equal(s.current, 3);
  assert.equal((await streak.applyPerfectDay(u._id, day(2))).applied, false); // idempotent
  await streak.applyPerfectDay(u._id, day(5)); // gap
  s = await M.Streak.findOne({ user: u._id });
  assert.equal(s.current, 1); assert.equal(s.longest, 3);
  // displayed streak is zero once a full day was missed
  assert.equal(streak.effectiveCurrent(s, day(7)), 0);
  assert.equal(streak.effectiveCurrent(s, day(6)), 1);
  assert.equal(streak.effectiveCurrent(s, day(5)), 1);

  // 7-day milestone through the real completion path: pre-seed 6 prior days
  const today = dates.todayKey();
  await M.Streak.updateOne({ user: u._id }, { current: 6, longest: 6, lastCompletedDate: dates.addDays(today, -1), streakStartDate: dates.addDays(today, -6) });
  const login = agent();
  await M.User.updateOne({ _id: u._id }, { passwordHash: await bcrypt.hash('Passw0rd!x', 4) });
  await login.post('/api/auth/login').send({ email: 'streaky@test.dev', password: 'Passw0rd!x' });
  await login.post('/api/completions').send({ questionId: qs[0].id });
  const done = await login.post('/api/completions').send({ questionId: qs[1].id });
  assert.equal(done.body.streak.current, 7);
  assert.ok(done.body.events.some((e) => e.type === 'STREAK_7' && e.points === 25));
  assert.equal(await M.PointsTransaction.countDocuments({ user: u._id, type: 'STREAK_7' }), 1);
  assert.equal(done.body.totalPoints, 10 + 15 + 5 + 25);
});

test('video library: signed upload requires staff, unpublished hidden from students', async () => {
  assert.equal((await agent().post('/api/admin/videos/signature')).status, 401);
  const st = agent();
  await st.post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' });
  assert.equal((await st.post('/api/admin/videos/signature')).status, 403);
  const sig = await admin.post('/api/admin/videos/signature');
  assert.equal(sig.status, 503); // no Cloudinary credentials in test env, never leaks a secret
  assert.ok(!JSON.stringify(sig.body).includes('secret'));

  const body = {
    title: 'Two Sum walkthrough', description: 'Hash map approach', questionId: qs[0].id,
    cloudinaryPublicId: 'codesprint/solutions/two-sum-abc', duration: 321,
    chapters: [{ title: 'Intro', startSeconds: 0 }, { title: 'Code', startSeconds: 120 }],
  };
  const created = await editor.post('/api/admin/videos').send(body);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.video._id;
  assert.equal(created.body.video.published, false);
  assert.equal((await admin.post('/api/admin/videos').send({ ...body, cloudinaryPublicId: 'codesprint/solutions/other' })).status, 409);
  assert.equal((await admin.post('/api/admin/videos').send({ ...body, questionId: new mongoose.Types.ObjectId().toString(), cloudinaryPublicId: 'codesprint/solutions/z' })).status, 400);

  assert.equal((await st.get('/api/videos')).body.items.length, 0);
  assert.equal((await st.get(`/api/videos/${id}`)).status, 404);
  assert.equal((await st.get('/api/videos/two-sum')).status, 404);

  assert.equal((await admin.patch(`/api/admin/videos/${id}/publish`).send({ published: true })).status, 200);
  const list = await st.get('/api/videos?search=two&difficulty=Easy&topic=Hashing');
  assert.equal(list.body.items.length, 1);
  const bySlug = await st.get('/api/videos/two-sum');
  assert.equal(bySlug.status, 200);
  assert.equal(bySlug.body.video.chapters.length, 2);
  assert.equal(bySlug.body.video.question.leetcodeUrl, 'https://leetcode.com/problems/two-sum/');
  const t = await st.get('/api/challenges/today');
  assert.equal(t.body.challenge.questions[0].hasVideo, true);

  const upd = await admin.put(`/api/admin/videos/${id}`).send({ title: 'Two Sum (updated)', cloudinaryPublicId: 'codesprint/solutions/two-sum-v2' });
  assert.equal(upd.body.video.title, 'Two Sum (updated)');
  await admin.patch(`/api/admin/videos/${id}/publish`).send({ published: false });
  assert.equal((await st.get('/api/videos/two-sum')).status, 404);
  assert.equal((await admin.delete(`/api/admin/videos/${id}`)).status, 200);
  assert.equal((await M.Question.findById(qs[0].id)).videoSolution, undefined);
});

test('roadmaps: admin CRUD, publish gating, student progress', async () => {
  const rm = await admin.post('/api/admin/roadmaps').send({
    title: 'DSA Beginner Roadmap', description: 'Start here',
    sections: [{ title: 'Foundations', topics: [{ title: 'Arrays', questions: [qs[0].id, qs[2].id] }, { title: 'Stacks', questions: [qs[3].id] }] }],
  });
  assert.equal(rm.status, 201);
  const id = rm.body.roadmap._id;
  const st = agent();
  await st.post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' });
  assert.equal((await st.get('/api/roadmaps')).body.items.length, 0);
  assert.equal((await st.get(`/api/roadmaps/${id}`)).status, 404);
  await admin.put(`/api/admin/roadmaps/${id}`).send({ published: true });
  const list = await st.get('/api/roadmaps');
  assert.equal(list.body.items[0].total, 3);
  assert.equal(list.body.items[0].completed, 1); // qs[0] was completed via the daily challenge
  assert.equal((await st.put(`/api/roadmaps/${id}/progress`).send({ questionId: qs[1].id, done: true })).status, 400);
  await st.put(`/api/roadmaps/${id}/progress`).send({ questionId: qs[3].id, done: true });
  const p = await st.get(`/api/roadmaps/${id}/progress`);
  assert.equal(p.body.progress.completed, 2);
  assert.equal(p.body.progress.percent, 67);
  const detail = await st.get(`/api/roadmaps/${id}`);
  assert.equal(detail.body.roadmap.sections[0].topics[0].questions[0].completed, true);
  assert.equal((await admin.post('/api/admin/roadmaps').send({ title: 'Bad', sections: [{ title: 'S', topics: [{ title: 'T', questions: [new mongoose.Types.ObjectId().toString()] }] }] })).status, 400);
});

test('leaderboards: global order, weekly, college, search, pagination, no client writes', async () => {
  const st = agent();
  await st.post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' });
  const g = await st.get('/api/leaderboard/global?limit=2');
  assert.equal(g.status, 200);
  assert.equal(g.body.items[0].name, 'Streaky'); // 55 points
  assert.equal(g.body.items[0].rank, 1);
  assert.equal(g.body.items[1].name, 'Student 1'); // 30 points
  assert.equal(g.body.pagination.limit, 2);
  assert.equal(g.body.me.rank, 2);
  const search = await agent().get('/api/leaderboard/global?search=student%201');
  assert.equal(search.body.items.length, 1);
  assert.equal(search.body.items[0].rank, 2); // true rank preserved while searching
  const w = await st.get('/api/leaderboard/weekly');
  assert.equal(w.body.items[0].name, 'Streaky');
  assert.equal(w.body.items[0].points, 55);
  assert.equal(w.body.items[0].currentStreak, 7);
  assert.equal((await st.get('/api/leaderboard/monthly')).body.items.length >= 2, true);
  const col = await st.get('/api/leaderboard/college');
  assert.equal(col.body.college, 'IIT Bombay');
  assert.ok(col.body.items.every((i) => i.college === 'IIT Bombay'));
  assert.equal((await agent().get('/api/leaderboard/colleges')).body.items.length >= 2, true);
  // there is no endpoint allowing a client to set points
  assert.equal((await st.put('/api/users/me').send({ totalPoints: 99999 })).status, 400);
  assert.equal((await st.post('/api/admin/points/adjust').send({})).status, 403);
});

test('admin: void completion reverses points and streak; competition reset keeps history; role & suspend', async () => {
  const u = await M.User.findOne({ email: 'streaky@test.dev' });
  const comps = await admin.get('/api/admin/completions?user=' + u._id);
  const target = comps.body.items.find((c) => c.date === dates.todayKey());
  assert.equal((await editor.post(`/api/admin/completions/${target._id}/void`).send({ reason: 'Suspicious' })).status, 403); // admin-only
  const v = await admin.post(`/api/admin/completions/${target._id}/void`).send({ reason: 'Invalid submission' });
  assert.equal(v.status, 200);
  const after = await M.User.findById(u._id);
  assert.ok(after.totalPoints < 55);
  const s = await M.Streak.findOne({ user: u._id });
  assert.equal(s.current, 0); // seeded history had no completion rows; only real records count
  assert.equal((await admin.post(`/api/admin/completions/${target._id}/void`).send({ reason: 'again' })).status, 409);
  assert.equal(await M.PointsTransaction.countDocuments({ user: u._id, type: 'REVERSAL' }) > 0, true);

  const before = await M.PointsTransaction.countDocuments();
  const reset = await admin.post('/api/admin/competitions/reset').send({ type: 'weekly' });
  assert.equal(reset.status, 200);
  assert.equal(await M.PointsTransaction.countDocuments(), before); // history untouched
  const st = agent();
  await st.post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' });
  assert.equal((await st.get('/api/leaderboard/weekly')).body.items.length, 0); // fresh period
  assert.ok((await st.get('/api/leaderboard/global')).body.items.length > 0);
  const hist = await admin.get('/api/admin/competitions');
  assert.ok(hist.body.items.some((c) => c.finalStandings.length > 0));

  // role + suspension
  const s1 = await M.User.findOne({ email: 's1@test.dev' });
  assert.equal((await editor.put(`/api/admin/users/${s1._id}/role`).send({ role: 'EDITOR' })).status, 403);
  assert.equal((await admin.put(`/api/admin/users/${s1._id}/role`).send({ role: 'ADMIN' })).status, 400);
  assert.equal((await admin.put(`/api/admin/users/${s1._id}/role`).send({ role: 'EDITOR' })).status, 200);
  assert.equal((await st.get('/api/auth/me')).status, 401); // role change invalidates old session
  assert.equal((await admin.put(`/api/admin/users/${s1._id}/role`).send({ role: 'STUDENT' })).status, 200);
  assert.equal((await admin.put(`/api/admin/students/${s1._id}/status`).send({ status: 'suspended' })).status, 200);
  assert.equal((await agent().post('/api/auth/login').send({ email: 's1@test.dev', password: 'Passw0rd!x' })).status, 403);
  assert.equal((await admin.put(`/api/admin/students/${s1._id}/status`).send({ status: 'active' })).status, 200);
  const adminUser = await M.User.findOne({ email: 'admin@test.dev' });
  assert.equal((await admin.put(`/api/admin/students/${adminUser._id}/status`).send({ status: 'suspended' })).status, 400);
});

test('scoring rules are configurable by admin only and used by the server', async () => {
  assert.equal((await editor.put('/api/admin/settings').send({ scoring: { firstQuestion: 99 } })).status, 403);
  const r = await admin.put('/api/admin/settings').send({ scoring: { firstQuestion: 20 } });
  assert.equal(r.body.settings.scoring.firstQuestion, 20);
  assert.equal((await admin.put('/api/admin/settings').send({ scoring: { firstQuestion: -5 } })).status, 400);
  const a = agent();
  await a.post('/api/auth/register').send(reg(9));
  const c = await a.post('/api/completions').send({ questionId: qs[0].id });
  assert.equal(c.body.pointsEarned, 20);
  await admin.put('/api/admin/settings').send({ scoring: { firstQuestion: 10 } });
});

test('public profile hides private data; overview and analytics respond', async () => {
  const u = await M.User.findOne({ email: 's3@test.dev' });
  const p = await agent().get(`/api/users/${u._id}`);
  assert.equal(p.status, 200);
  assert.equal(p.body.profile.email, undefined);
  assert.equal(p.body.profile.role, undefined);
  assert.equal(p.body.profile.leetcodeProfileUrl, 'https://leetcode.com/u/lc_3/');
  assert.ok(Array.isArray(p.body.profile.heatmap));
  assert.equal((await agent().get('/api/users/not-an-id')).status, 404);
  const o = await admin.get('/api/admin/overview');
  assert.equal(o.status, 200);
  assert.ok(o.body.overview.totalStudents >= 3);
  assert.equal(o.body.overview.weeklyActivity.length, 7);
  const an = await editor.get('/api/admin/analytics');
  assert.equal(an.status, 200);
  assert.ok(an.body.analytics.series.length >= 30);
  const stud = await admin.get('/api/admin/students?search=streaky');
  assert.equal(stud.body.items.length, 1);
});

test('password reset flow invalidates old sessions', async () => {
  const crypto = require('crypto');
  const a = agent();
  await a.post('/api/auth/login').send({ email: 's3@test.dev', password: 'Passw0rd!x' });
  const r = await agent().post('/api/auth/forgot-password').send({ email: 'nobody@test.dev' });
  assert.equal(r.status, 200); // no enumeration
  await agent().post('/api/auth/forgot-password').send({ email: 's3@test.dev' });
  const token = 'a'.repeat(64);
  await M.User.updateOne({ email: 's3@test.dev' }, { resetTokenHash: crypto.createHash('sha256').update(token).digest('hex'), resetTokenExpires: new Date(Date.now() + 60000) });
  assert.equal((await agent().post('/api/auth/reset-password').send({ token: 'b'.repeat(64), email: 's3@test.dev', password: 'NewPassw0rd' })).status, 400);
  assert.equal((await agent().post('/api/auth/reset-password').send({ token, email: 's3@test.dev', password: 'NewPassw0rd' })).status, 200);
  assert.equal((await a.get('/api/auth/me')).status, 401);
  assert.equal((await agent().post('/api/auth/login').send({ email: 's3@test.dev', password: 'NewPassw0rd' })).status, 200);
});

test('LeetCode verification: unverified solves earn nothing, username mandatory, admins excluded', async () => {
  // username is mandatory and must exist on LeetCode
  const noName = { ...reg(20) }; delete noName.leetcodeUsername;
  assert.equal((await agent().post('/api/auth/register').send(noName)).status, 400);
  assert.equal((await agent().post('/api/auth/register').send(reg(21, { leetcodeUsername: 'ghost_user' }))).status, 422);

  // a student who has NOT solved the problem on LeetCode cannot claim it
  const a = agent();
  assert.equal((await a.post('/api/auth/register').send(reg(22))).status, 201);
  lcSolved.delete('two-sum');
  const denied = await a.post('/api/completions').send({ questionId: qs[0].id });
  assert.equal(denied.status, 422);
  assert.equal(denied.body.code, 'NOT_VERIFIED');
  const u = await M.User.findOne({ email: 's22@test.dev' });
  assert.equal(u.totalPoints, 0);
  assert.equal(await M.Completion.countDocuments({ user: u._id }), 0);
  // after solving it, the same click verifies and records it
  lcSolved.add('two-sum');
  const ok = await a.post('/api/completions').send({ questionId: qs[0].id });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.completion.verificationStatus, 'verified');
  const rec = await M.Completion.findOne({ user: u._id });
  assert.equal(rec.verificationMethod, 'LEETCODE_PUBLIC');

  // a submission from another day does not count
  const old = lcFetcher;
  require('../src/services/verification').leetcodePublic.setFetcher(async () => ({ exists: true, submissions: [{ title: 'x', titleSlug: 'add-two-numbers', timestamp: String(Math.floor(Date.now() / 1000) - 3 * 86400) }] }));
  assert.equal((await a.post('/api/completions').send({ questionId: qs[1].id })).body.code, 'NOT_VERIFIED');
  // LeetCode outage fails closed
  require('../src/services/verification').leetcodePublic.setFetcher(async () => { throw new (require('../src/utils/AppError'))(503, 'down', 'LEETCODE_UNAVAILABLE'); });
  assert.equal((await a.post('/api/completions').send({ questionId: qs[1].id })).status, 503);
  require('../src/services/verification').leetcodePublic.setFetcher(old);

  // admin progress never counts and admins are not ranked
  const adminTry = await admin.post('/api/completions').send({ questionId: qs[0].id });
  assert.equal(adminTry.status, 403);
  assert.equal(adminTry.body.code, 'ADMIN_NOT_ELIGIBLE');
  const adminUser = await M.User.findOne({ email: 'admin@test.dev' });
  await M.User.updateOne({ _id: adminUser._id }, { totalPoints: 9999 }); // even if an admin somehow had points
  const g = await agent().get('/api/leaderboard/global?limit=50');
  assert.ok(!g.body.items.some((i) => i.name === 'ADMIN'));
  assert.ok(g.body.items.every((i) => i.points < 9999));
});
