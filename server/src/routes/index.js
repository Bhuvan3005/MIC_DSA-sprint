const express = require('express');
const { z } = require('zod');
const s = require('../validators/schemas');
const { validate, validObjectId } = require('../middleware/validate');
const { authenticate, optionalAuth, requireStaff, requireAdmin } = require('../middleware/auth');
const { authLimiter, completionLimiter } = require('../middleware/security');

const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const questions = require('../controllers/questionController');
const challenges = require('../controllers/challengeController');
const completions = require('../controllers/completionController');
const leaderboard = require('../controllers/leaderboardController');
const videos = require('../controllers/videoController');
const roadmaps = require('../controllers/roadmapController');
const admin = require('../controllers/adminController');

const router = express.Router();
const q = (schema) => validate({ query: schema });
const b = (schema) => validate({ body: schema });

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

// ---------- Auth ----------
router.post('/auth/register', authLimiter, b(s.register), auth.register);
router.post('/auth/login', authLimiter, b(s.login), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.me);
router.post('/auth/forgot-password', authLimiter, b(s.forgot), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, b(s.reset), auth.resetPassword);
router.post('/auth/change-password', authenticate, b(s.changePassword), auth.changePassword);

// ---------- Users ----------
router.get('/users/me', authenticate, users.getMe);
router.put('/users/me', authenticate, b(s.updateMe), users.updateMe);
router.get('/users/me/dashboard', authenticate, users.dashboard);
router.get('/users/me/heatmap', authenticate, users.myHeatmap);
router.get('/users/me/achievements', authenticate, users.achievements);
router.put('/users/me/avatar', authenticate, b(s.avatarBody), users.setAvatar);
router.delete('/users/me/avatar', authenticate, users.removeAvatar);
router.get('/users/:id/avatar', users.getAvatar);
router.get('/users/:id', optionalAuth, users.getPublicProfile);

// ---------- Questions (read) ----------
router.get('/questions', authenticate, q(s.questionListQuery), questions.list);
router.get('/questions/:id', authenticate, questions.get);

// ---------- Challenges ----------
router.get('/challenges/today', authenticate, challenges.today);
router.get('/challenges/history', authenticate, q(s.pageQuery), challenges.history);
router.get('/challenges/:date', authenticate, challenges.byDate);

// ---------- Completions ----------
router.post('/completions', authenticate, completionLimiter, b(s.completionBody), completions.create);
router.get('/completions/me', authenticate, completions.mine);

// ---------- Leaderboard (public read, optional auth adds "me") ----------
router.get('/leaderboard/global', optionalAuth, q(s.boardQuery), leaderboard.global);
router.get('/leaderboard/weekly', optionalAuth, q(s.boardQuery), leaderboard.weekly);
router.get('/leaderboard/monthly', optionalAuth, q(s.boardQuery), leaderboard.monthly);
router.get('/leaderboard/college', optionalAuth, q(s.boardQuery), leaderboard.college);
router.get('/leaderboard/colleges', leaderboard.colleges);

// ---------- Videos (published only) ----------
router.get('/videos', authenticate, q(s.videoListQuery), videos.list);
router.get('/videos/:id', authenticate, videos.get);

// ---------- Roadmaps ----------
router.get('/roadmaps', authenticate, roadmaps.list);
router.get('/roadmaps/:id', authenticate, validObjectId('id'), roadmaps.get);
router.get('/roadmaps/:id/progress', authenticate, validObjectId('id'), roadmaps.progress);
router.put('/roadmaps/:id/progress', authenticate, validObjectId('id'), b(s.roadmapProgressBody), roadmaps.setProgress);

// ---------- Admin / Editor ----------
const staff = express.Router();
staff.use(authenticate, requireStaff);

staff.get('/overview', admin.overview);
staff.get('/analytics', admin.analytics);

staff.get('/questions', q(s.questionListQuery), questions.adminList);
staff.post('/questions', b(s.questionBody), questions.create);
staff.put('/questions/:id', validObjectId('id'), b(s.questionBody), questions.update);
staff.patch('/questions/:id/featured', validObjectId('id'), questions.toggleFeatured);
staff.delete('/questions/:id', validObjectId('id'), questions.remove);

const challengeQuery = z.object({ ...s.pageQuery.shape, from: s.dateKey.optional(), to: s.dateKey.optional() });
staff.get('/challenges', q(challengeQuery), challenges.adminList);
staff.post('/challenges', b(s.challengeBody), challenges.create);
staff.get('/challenges/:id/preview', validObjectId('id'), challenges.preview);
staff.put('/challenges/:id', validObjectId('id'), b(s.challengePatch), challenges.update);
staff.delete('/challenges/:id', validObjectId('id'), challenges.remove);

staff.get('/videos/config', videos.config);
staff.post('/videos/signature', videos.signature);
staff.get('/videos', q(s.videoListQuery), videos.adminList);
staff.post('/videos', b(s.videoBody), videos.create);
staff.put('/videos/:id', validObjectId('id'), b(s.videoPatch), videos.update);
staff.patch('/videos/:id/publish', validObjectId('id'), b(z.object({ published: z.boolean() }).strict()), videos.setPublished);
staff.delete('/videos/:id', validObjectId('id'), videos.remove);

staff.get('/roadmaps', roadmaps.adminList);
staff.get('/roadmaps/:id', validObjectId('id'), roadmaps.adminGet);
staff.post('/roadmaps', b(s.roadmapBody), roadmaps.create);
staff.put('/roadmaps/:id', validObjectId('id'), b(s.roadmapPatch), roadmaps.update);
staff.delete('/roadmaps/:id', validObjectId('id'), roadmaps.remove);

staff.get('/students', q(s.studentListQuery), admin.students);
staff.get('/settings', admin.getSettings);

// Admin-only: account control, scoring configuration and competition management.
staff.put('/students/:id/status', requireAdmin, validObjectId('id'), b(s.statusBody), admin.setStatus);
staff.put('/users/:id/role', requireAdmin, validObjectId('id'), b(s.roleBody), admin.setRole);
staff.put('/settings', requireAdmin, b(s.settingsBody), admin.putSettings);
staff.get('/leaderboard/stats', admin.leaderboardStats);
staff.get('/competitions', admin.competitions);
staff.post('/competitions', requireAdmin, b(s.competitionBody), admin.createCompetition);
staff.post('/competitions/reset', requireAdmin, b(s.resetBody), admin.resetCompetition);
staff.get('/completions', requireAdmin, admin.completions);
staff.post('/completions/:id/void', requireAdmin, validObjectId('id'), b(s.voidBody), admin.voidCompletion);
staff.post('/points/adjust', requireAdmin, b(z.object({ userId: s.objectId, points: z.coerce.number().int().min(-10000).max(10000), note: z.string().trim().min(3).max(200) }).strict()), admin.adjustPoints);

router.use('/admin', staff);

module.exports = router;
