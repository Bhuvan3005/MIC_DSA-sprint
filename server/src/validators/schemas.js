const { z } = require('zod');
const { DIFFICULTIES, TOPICS } = require('../config/constants');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const str = (min = 1, max = 200) => z.string().trim().min(min).max(max);
const optStr = (max = 200) => z.string().trim().max(max).optional();
const year = z.coerce.number().int().min(2000).max(2100);
const leetcodeUsername = z.string().trim().regex(/^[A-Za-z0-9_-]{1,40}$/, 'Invalid LeetCode username');

const password = z.string().min(8, 'Password must be at least 8 characters').max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter').regex(/\d/, 'Password must contain a number');

const register = z.object({
  name: str(2, 80),
  email: z.string().trim().toLowerCase().email().max(160),
  password,
  college: str(2, 120),
  graduationYear: year,
  leetcodeUsername, // mandatory: solves are verified against this public LeetCode profile
}).strict();

const login = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) }).strict();
const forgot = z.object({ email: z.string().trim().toLowerCase().email() }).strict();
const reset = z.object({ token: z.string().min(20).max(200), email: z.string().trim().toLowerCase().email(), password }).strict();

const updateMe = z.object({
  name: str(2, 80).optional(),
  college: str(2, 120).optional(),
  graduationYear: year.optional(),
  leetcodeUsername: leetcodeUsername.optional(),
  bio: optStr(280),
}).strict();

// A pre-cropped image sent as a data URL (the client resizes to 256px). Real size and file type are re-checked server-side.
const avatarBody = z.object({ image: z.string().max(90000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/, 'Image must be a PNG, JPEG or WebP') }).strict();

const changePassword = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict();

const pageQuery = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

const questionBody = z.object({
  title: str(2, 200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Slug may contain lowercase letters, digits and hyphens').max(120),
  leetcodeUrl: z.string().trim().url().optional(),
  number: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  difficulty: z.enum(DIFFICULTIES),
  topics: z.array(z.enum(TOPICS)).max(8).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  description: optStr(2000),
  recommendedMinutes: z.coerce.number().int().min(1).max(600).optional(),
  featured: z.boolean().optional(),
}).strict();

const questionListQuery = z.object({
  ...pageQuery,
  search: z.string().trim().max(100).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  topic: z.enum(TOPICS).optional(),
  featured: z.enum(['true', 'false']).optional(),
  hasVideo: z.enum(['true', 'false']).optional(),
});

const challengeBody = z.object({
  date: dateKey,
  questions: z.array(objectId).min(1).max(5),
  published: z.boolean().optional(),
  note: optStr(300),
}).strict();
const challengePatch = challengeBody.partial().strict();

const completionBody = z.object({ questionId: objectId }).strict();

const chapter = z.object({ title: str(1, 120), startSeconds: z.coerce.number().min(0).max(86400) }).strict();
const videoBody = z.object({
  title: str(2, 200),
  description: optStr(4000),
  questionId: objectId,
  difficulty: z.enum(DIFFICULTIES).optional(),
  topics: z.array(z.enum(TOPICS)).max(8).optional(),
  cloudinaryPublicId: z.string().trim().min(3).max(300),
  secureUrl: z.string().url().max(600).optional(),
  duration: z.coerce.number().min(0).optional(),
  thumbnailUrl: z.string().url().max(600).optional(),
  bytes: z.coerce.number().optional(),
  format: z.string().max(10).optional(),
  chapters: z.array(chapter).max(60).optional(),
  published: z.boolean().optional(),
}).strict();
const videoPatch = videoBody.partial().strict();

const videoListQuery = z.object({
  ...pageQuery,
  search: z.string().trim().max(100).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  topic: z.enum(TOPICS).optional(),
  roadmap: objectId.optional(),
});

const roadmapBody = z.object({
  title: str(2, 140),
  description: optStr(1000),
  order: z.coerce.number().int().optional(),
  published: z.boolean().optional(),
  sections: z.array(z.object({
    title: str(1, 120),
    topics: z.array(z.object({
      title: str(1, 120),
      description: optStr(500),
      questions: z.array(objectId).max(100).default([]),
    }).strict()).max(50).default([]),
  }).strict()).max(40).optional(),
}).strict();
const roadmapPatch = roadmapBody.partial().strict();
const roadmapProgressBody = z.object({ questionId: objectId, done: z.boolean() }).strict();

const boardQuery = z.object({
  ...pageQuery,
  search: z.string().trim().max(80).optional(),
  college: z.string().trim().max(120).optional(),
});

const statusBody = z.object({ status: z.enum(['active', 'suspended']) }).strict();
const roleBody = z.object({ role: z.enum(['STUDENT', 'EDITOR']) }).strict();
const settingsBody = z.object({
  scoring: z.object({
    firstQuestion: z.coerce.number().int().min(0).max(10000).optional(),
    secondQuestion: z.coerce.number().int().min(0).max(10000).optional(),
    bothBonus: z.coerce.number().int().min(0).max(10000).optional(),
    streak7: z.coerce.number().int().min(0).max(10000).optional(),
    streak30: z.coerce.number().int().min(0).max(10000).optional(),
  }).strict().optional(),
  dailyQuestionCount: z.coerce.number().int().min(1).max(5).optional(),
}).strict();
const voidBody = z.object({ reason: str(3, 300) }).strict();
const resetBody = z.object({ type: z.enum(['weekly', 'monthly']) }).strict();
const competitionBody = z.object({
  name: str(2, 120),
  type: z.enum(['weekly', 'monthly', 'custom']),
  startsAt: z.coerce.date().optional(),
}).strict();
const studentListQuery = z.object({
  ...pageQuery,
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  role: z.enum(['STUDENT', 'EDITOR', 'ADMIN']).optional(),
});

module.exports = {
  avatarBody, register, login, forgot, reset, updateMe, changePassword, questionBody, questionListQuery,
  challengeBody, challengePatch, completionBody, videoBody, videoPatch, videoListQuery,
  roadmapBody, roadmapPatch, roadmapProgressBody, boardQuery, statusBody, roleBody, settingsBody,
  voidBody, resetBody, competitionBody, studentListQuery, pageQuery: z.object(pageQuery),
  dateKey, objectId,
};
