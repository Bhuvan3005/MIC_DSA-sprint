# CodeSprint - *Your daily DSA journey starts here.*

A full-stack platform where college students across India practise Data Structures & Algorithms through two curated LeetCode problems a day, video walkthroughs, streaks and competitive leaderboards.

| Layer | Tech |
|---|---|
| Frontend (`client/`) | React 18, Vite, Tailwind CSS, React Router, Axios, Lucide, Recharts → **Netlify** |
| Backend (`server/`) | Node.js, Express 4, Mongoose, JWT (HTTP-only cookie), bcrypt, Zod → **Render / Railway** |
| Database | **MongoDB Atlas** |
| Videos | **Cloudinary** (signed direct uploads; only metadata + URLs live in MongoDB) |

---

## 1. What's implemented

**Student app** - `/dashboard` `/daily-challenges` `/leaderboard` `/videos` `/profile` (+ public `/profile/:id`, `/videos/:question-slug`)
- Register (college, graduation year, LeetCode username), login/logout, forgot/reset password, edit profile, change password.
- Dashboard: streaks, points, rank, today's two challenges, activity heatmap and achievements.
- Daily challenges: *Solve* opens LeetCode in a new tab; completion is verified against the student's public LeetCode profile. History of previous days.
- Streak engine + GitHub-style heatmap, monthly activity, longest streak.
- Leaderboards: Global / Weekly / Monthly / College-wise, podium for top 3, search, pagination, "your position".
- Video library: search, difficulty and topic filters, player with clickable chapters, related solutions. Unpublished videos are 404 to students.

**Host / editor panel** - `/admin` (ADMIN and EDITOR only)
Overview · Daily Challenges (schedule, preview, unpublish, validation) · Question Bank (CRUD, search, filters, featured) · Video Solutions (Cloudinary upload with progress, chapters, replace, publish/unpublish, preview, delete) · Students (suspend/reactivate, grant EDITOR) · Leaderboard (stats, competition reset, void invalid submissions) · Analytics · Settings (scoring rules).

### Business rules (all enforced on the server)
| Rule | Where |
|---|---|
| Role is always `STUDENT` on registration; request schemas are `strict()` so extra fields (e.g. `role`, `totalPoints`) are rejected | `validators/schemas.js`, `authController.js` |
| Every `/api/admin/*` route runs `authenticate` + `requireStaff`; role/status/settings/competition/void routes additionally require `ADMIN`. Role is read from the DB each request, never trusted from the token | `middleware/auth.js`, `routes/index.js` |
| Suspending or changing a role bumps `tokenVersion`, invalidating live sessions instantly | `adminController.js` |
| One challenge per date (unique index); exactly N questions (default 2, configurable); no duplicate question in a day; no past dates; challenges with completions are locked | `models/DailyChallenge.js`, `challengeController.js` |
| Completion date comes from the **server clock** in `PLATFORM_TIMEZONE` (default `Asia/Kolkata`); only today's assigned questions can be completed | `completionService.js`, `utils/dates.js` |
| No duplicate completions (unique `user+challenge+question`) and no duplicate points (unique `PointsTransaction.dedupeKey`) - verified with concurrent requests | models + `pointsService.js` |
| Points: first 10, second 15, both-bonus 5, 7-day streak 25, 30-day streak 100 - all editable in Admin → Settings; changes apply to future awards only | `settingsService.js`, `completionService.js` |
| Streak = consecutive days on which **all** daily questions were completed. Missing a day resets it (display is 0 once a full day is missed). Rebuilt from records when a completion is voided | `streakService.js` |
| Points ledger is append-only. Voiding a submission adds `REVERSAL` rows and rebuilds the streak | `pointsService.js`, `completionService.js` |
| Competition reset freezes standings into `Competition.finalStandings` and starts a new period; ledger history is untouched | `leaderboardService.js` |
| No endpoint lets a client write points, ranks or streaks | - |

### LeetCode verification
A LeetCode username is **mandatory** at registration (it must exist) and can be edited in the profile. After solving on LeetCode, the student clicks **"I solved it"**; the server then reads the student's *public* LeetCode profile and only records the completion (and awards points) if it finds an **accepted submission of that exact problem made today** (platform timezone). Otherwise nothing is recorded and the student sees why. If LeetCode can't be reached the check **fails closed** (HTTP 503, no points).

- Implemented as an adapter in `services/verification/leetcodePublic.js`; completions are stored with `verificationMethod: LEETCODE_PUBLIC`, `verificationStatus: verified`.
- **Caveat:** LeetCode has no official public API, so this uses the same public GraphQL endpoint as leetcode.com (`recentAcSubmissionList`, ~last 20 accepted submissions). It is unofficial, can change or rate-limit, and may be restricted by LeetCode's terms. Students' LeetCode submissions must be public. We never ask for passwords or cookies.
- Only today's submissions count, so problems solved earlier must be re-submitted on the day. `VERIFICATION_MODE=self` (dev only) bypasses verification.
- **Admin accounts never take part**: `ADMIN` users can't record completions and are excluded from all leaderboards.

---

## 2. Project structure

```
client/src/{components/{common,layout,dashboard,challenges,leaderboard,videos,admin},pages/{auth,student,admin},hooks,context,services,utils,styles}
server/src/{config,controllers,middleware,models,routes,services,validators,utils,jobs}, app.js, server.js
server/test/api.test.js       # integration tests
```
Models: User, Question, DailyChallenge, Completion, Streak, VideoSolution, Roadmap, RoadmapProgress, Badge, UserBadge, PointsTransaction, Competition (+ Setting). Indexes are declared on each schema (unique email/slug/date/publicId, compound indexes for leaderboards, completions and the ledger).

---

## 3. Run locally

Prerequisites: Node.js 22, a MongoDB Atlas cluster (or local MongoDB 5+; leaderboards use `$setWindowFields`).

```bash
# 1. API
cd server
cp .env.example .env        # fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm ci
npm run seed                # 50 real LeetCode questions, 4 roadmaps, 14 days of challenges
npm run seed -- --demo      # OPTIONAL: labelled demo students so leaderboards aren't empty (dev only)
npm run dev                 # http://localhost:5000  (health: /api/health)

# 2. Web app (new terminal)
cd client
npm ci
npm run dev                 # http://localhost:5173  (Vite proxies /api -> :5000)
```
Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set to reach `/admin`. Students register at `/register`.

### Environment variables (`server/.env.example`)
| Variable | Needed for |
|---|---|
| `MONGODB_URI`, `JWT_SECRET` | **Required** (server refuses to start without valid values) |
| `CLIENT_URL` | CORS allow-list (comma-separated), reset links |
| `PLATFORM_TIMEZONE` | Streak/day boundaries (default `Asia/Kolkata`) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Video uploads (API returns 503 until set; the admin UI shows a banner) |
| `VIDEO_MAX_SIZE_MB`, `VIDEO_ALLOWED_FORMATS` | Upload limits (client and server enforce) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Bootstrap the first ADMIN |
| `SMTP_*`, `MAIL_FROM` | Password-reset emails (without SMTP the link is logged in dev) |
| `CROSS_SITE_COOKIES` | Only if frontend and API are on different sites (see below) |

`client/.env.example`: `VITE_API_URL` (leave empty to use same-origin `/api`).

---

## 4. Tests

```bash
cd server && npm test
```
Uses the MongoDB deployment configured by `MONGODB_URI` in a disposable test environment. The suite drops the `codesprint_test` database before and after each run. It exercises: registration/role-escalation attempts, CSRF header, RBAC, question CRUD + filters, challenge validation, completion flow, duplicate/concurrent completions, points maths, streak maths (consecutive/gap/milestone), video publish gating, roadmaps, leaderboards (ordering, search rank, weekly, college), voiding, competition reset, role/suspension, configurable scoring, public profile privacy, password reset.

---

## 5. Publish to GitHub and deploy

### Push to GitHub

Create an empty GitHub repository. From the project root, run these commands with its URL.

```bash
git init -b main
git add .
git status --short
git commit -m "Initial CodeSprint setup"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPO.git
git push -u origin main
```

The repository includes both lockfiles and the `.env.example` templates. Git ignores local credentials, dependencies, builds and database files.

### Deploy the API

1. Provision a MongoDB Atlas cluster and grant the API host network access.
2. Create a Node.js service on Render or Railway using `server` as its root directory. Use Node.js 22, `npm ci` to install dependencies and `npm start` to run the API.
3. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the API host's environment. Set `CLIENT_URL` to the public Netlify site origin and `CROSS_SITE_COOKIES=false`.
4. Check `/api/health` on the HTTPS API URL. Run `npm run seed` from the API host's shell if you want starter content.

### Deploy the frontend on Netlify

1. Import the GitHub repository in Netlify. The root `netlify.toml` sets the base directory to `client`, the build command to `npm run build:netlify`, and the publish directory to `dist` relative to that base.
2. Set `CODESPRINT_API_ORIGIN` in Netlify's build environment to the HTTPS API origin, such as `https://codesprint-api.onrender.com`. Leave `VITE_API_URL` empty so the browser uses the same-origin API proxy and auth cookies.
3. Deploy. Open `/api/health` on the Netlify site to check the proxy, reload a route such as `/login` to check client-side routing, then sign in.

**Cloudinary:** create a free account, copy cloud name/key/secret into the server env. Uploads go browser → Cloudinary using a signature minted by `POST /api/admin/videos/signature` (staff only). The secret never reaches the browser.

---

## 6. API reference (all under `/api`, JSON; mutating requests need header `X-Requested-With: codesprint`, which the web client sets automatically)

Lists are paginated with `?page=&limit=` and return `{ items, pagination: { page, limit, total, pages } }`. Errors: `{ success:false, message, code, details? }`.

**Auth** `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/change-password`
**Users** `GET /users/me` · `PUT /users/me` · `GET /users/me/dashboard` · `GET /users/me/heatmap` · `GET /users/:id` (public profile)
**Questions** `GET /questions?search&difficulty&topic` · `GET /questions/:idOrSlug`
**Challenges** `GET /challenges/today` · `GET /challenges/history` · `GET /challenges/:date` (never future dates)
**Completions** `POST /completions {questionId}` · `GET /completions/me`
**Leaderboard** `GET /leaderboard/{global|weekly|monthly|college}?search&college&page&limit` · `GET /leaderboard/colleges`
**Videos** `GET /videos?search&difficulty&topic&roadmap` · `GET /videos/:idOrQuestionSlug` (published only)
**Roadmaps** `GET /roadmaps` · `GET /roadmaps/:id` · `GET /roadmaps/:id/progress` · `PUT /roadmaps/:id/progress {questionId, done}`

**Admin / Editor** (`/admin/...`): `overview`, `analytics?days`, `questions` (GET/POST, PUT/DELETE `:id`, PATCH `:id/featured`), `challenges` (GET/POST, PUT/DELETE `:id`, GET `:id/preview`), `videos` (GET/POST, PUT/DELETE `:id`, PATCH `:id/publish`, POST `signature`, GET `config`), `roadmaps` (GET/POST, GET/PUT/DELETE `:id`), `students`, `settings` (GET), `leaderboard/stats`, `competitions` (GET).
**Admin only**: `PUT students/:id/status`, `PUT users/:id/role` (`STUDENT`|`EDITOR`), `PUT settings`, `POST competitions`, `POST competitions/reset`, `GET completions`, `POST completions/:id/void`, `POST points/adjust`.

---

## 7. Security notes
bcrypt (cost 12) with timing-equalised login · JWT in `HttpOnly`, `Secure` (prod), `SameSite` cookie, session version for revocation · CSRF defence via required custom header + strict CORS allow-list · Helmet · Zod validation with `strict()` schemas · `express-mongo-sanitize` · regex-escaped search · rate limits (global, auth, completions) · password-reset tokens are random, hashed at rest, expire in 30 min and are single-use · no user enumeration on forgot-password · generic 500 messages in production · Cloudinary assets are re-inspected server-side (format/size) before metadata is saved · `.env` is git-ignored.

## 8. Known limitations
- Verification relies on LeetCode's unofficial public endpoint (see above); an outage blocks completions until it recovers, and only the ~20 most recent accepted submissions are visible.
- Cloudinary's signed-upload API cannot cap file size per request; size is enforced in the UI and re-checked (and the asset deleted) server-side after upload. For a hard cap, add a Cloudinary upload preset with a size limit.
- Points use an idempotent append-only ledger with unique keys rather than multi-document transactions, so a standalone MongoDB works. Under an exact simultaneous double-submit of different questions the "first/second" ordering could be assigned out of order by a few points; duplicates can never occur.
- Heatmap/breakdown reflect CodeSprint daily challenges only, not a student's whole LeetCode history.
- Light theme is not implemented (dark-first design).
