/**
 * Seeds CONTENT for a fresh install: real LeetCode problem metadata, the four starter roadmaps and
 * a schedule of daily challenges. Safe to re-run (idempotent).
 *
 *   npm run seed            -> content only
 *   npm run seed -- --demo  -> additionally creates clearly-labelled DEMO students + activity so the
 *                              leaderboards have something to show. Never run --demo in production.
 */
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { connectDB } = require('../config/db');
const { bootstrap } = require('./bootstrap');
const { addDays, todayKey } = require('./dates');
const { Question, Roadmap, DailyChallenge, User } = require('../models');

const Q = (number, title, slug, difficulty, topics) => ({ number, title, slug, difficulty, topics });
const QUESTIONS = [
  Q(1, 'Two Sum', 'two-sum', 'Easy', ['Arrays', 'Hashing']),
  Q(217, 'Contains Duplicate', 'contains-duplicate', 'Easy', ['Arrays', 'Hashing']),
  Q(242, 'Valid Anagram', 'valid-anagram', 'Easy', ['Strings', 'Hashing']),
  Q(49, 'Group Anagrams', 'group-anagrams', 'Medium', ['Strings', 'Hashing']),
  Q(347, 'Top K Frequent Elements', 'top-k-frequent-elements', 'Medium', ['Hashing', 'Heaps']),
  Q(238, 'Product of Array Except Self', 'product-of-array-except-self', 'Medium', ['Arrays']),
  Q(53, 'Maximum Subarray', 'maximum-subarray', 'Medium', ['Arrays', 'Dynamic Programming']),
  Q(121, 'Best Time to Buy and Sell Stock', 'best-time-to-buy-and-sell-stock', 'Easy', ['Arrays', 'Sliding Window']),
  Q(125, 'Valid Palindrome', 'valid-palindrome', 'Easy', ['Two Pointers', 'Strings']),
  Q(167, 'Two Sum II - Input Array Is Sorted', 'two-sum-ii-input-array-is-sorted', 'Medium', ['Two Pointers', 'Binary Search']),
  Q(15, '3Sum', '3sum', 'Medium', ['Two Pointers', 'Arrays']),
  Q(11, 'Container With Most Water', 'container-with-most-water', 'Medium', ['Two Pointers', 'Greedy']),
  Q(3, 'Longest Substring Without Repeating Characters', 'longest-substring-without-repeating-characters', 'Medium', ['Sliding Window', 'Strings']),
  Q(424, 'Longest Repeating Character Replacement', 'longest-repeating-character-replacement', 'Medium', ['Sliding Window', 'Strings']),
  Q(704, 'Binary Search', 'binary-search', 'Easy', ['Binary Search']),
  Q(33, 'Search in Rotated Sorted Array', 'search-in-rotated-sorted-array', 'Medium', ['Binary Search']),
  Q(153, 'Find Minimum in Rotated Sorted Array', 'find-minimum-in-rotated-sorted-array', 'Medium', ['Binary Search']),
  Q(4, 'Median of Two Sorted Arrays', 'median-of-two-sorted-arrays', 'Hard', ['Binary Search']),
  Q(206, 'Reverse Linked List', 'reverse-linked-list', 'Easy', ['Linked Lists']),
  Q(21, 'Merge Two Sorted Lists', 'merge-two-sorted-lists', 'Easy', ['Linked Lists']),
  Q(141, 'Linked List Cycle', 'linked-list-cycle', 'Easy', ['Linked Lists', 'Two Pointers']),
  Q(19, 'Remove Nth Node From End of List', 'remove-nth-node-from-end-of-list', 'Medium', ['Linked Lists', 'Two Pointers']),
  Q(20, 'Valid Parentheses', 'valid-parentheses', 'Easy', ['Stacks', 'Strings']),
  Q(155, 'Min Stack', 'min-stack', 'Medium', ['Stacks']),
  Q(739, 'Daily Temperatures', 'daily-temperatures', 'Medium', ['Stacks']),
  Q(232, 'Implement Queue using Stacks', 'implement-queue-using-stacks', 'Easy', ['Queues', 'Stacks']),
  Q(102, 'Binary Tree Level Order Traversal', 'binary-tree-level-order-traversal', 'Medium', ['Trees', 'Queues']),
  Q(104, 'Maximum Depth of Binary Tree', 'maximum-depth-of-binary-tree', 'Easy', ['Trees']),
  Q(226, 'Invert Binary Tree', 'invert-binary-tree', 'Easy', ['Trees']),
  Q(98, 'Validate Binary Search Tree', 'validate-binary-search-tree', 'Medium', ['Trees']),
  Q(236, 'Lowest Common Ancestor of a Binary Tree', 'lowest-common-ancestor-of-a-binary-tree', 'Medium', ['Trees']),
  Q(200, 'Number of Islands', 'number-of-islands', 'Medium', ['Graphs']),
  Q(133, 'Clone Graph', 'clone-graph', 'Medium', ['Graphs']),
  Q(207, 'Course Schedule', 'course-schedule', 'Medium', ['Graphs']),
  Q(55, 'Jump Game', 'jump-game', 'Medium', ['Greedy']),
  Q(78, 'Subsets', 'subsets', 'Medium', ['Backtracking']),
  Q(46, 'Permutations', 'permutations', 'Medium', ['Backtracking']),
  Q(39, 'Combination Sum', 'combination-sum', 'Medium', ['Backtracking']),
  Q(70, 'Climbing Stairs', 'climbing-stairs', 'Easy', ['Dynamic Programming']),
  Q(198, 'House Robber', 'house-robber', 'Medium', ['Dynamic Programming']),
  Q(322, 'Coin Change', 'coin-change', 'Medium', ['Dynamic Programming']),
  Q(300, 'Longest Increasing Subsequence', 'longest-increasing-subsequence', 'Medium', ['Dynamic Programming', 'Binary Search']),
  Q(1143, 'Longest Common Subsequence', 'longest-common-subsequence', 'Medium', ['Dynamic Programming', 'Strings']),
  Q(215, 'Kth Largest Element in an Array', 'kth-largest-element-in-an-array', 'Medium', ['Heaps']),
  Q(295, 'Find Median from Data Stream', 'find-median-from-data-stream', 'Hard', ['Heaps']),
  Q(208, 'Implement Trie (Prefix Tree)', 'implement-trie-prefix-tree', 'Medium', ['Tries']),
  Q(212, 'Word Search II', 'word-search-ii', 'Hard', ['Tries', 'Backtracking']),
  Q(136, 'Single Number', 'single-number', 'Easy', ['Bit Manipulation']),
  Q(191, 'Number of 1 Bits', 'number-of-1-bits', 'Easy', ['Bit Manipulation']),
  Q(338, 'Counting Bits', 'counting-bits', 'Easy', ['Bit Manipulation', 'Dynamic Programming']),
];

const ROADMAPS = [
  { title: 'DSA Beginner Roadmap', description: 'Core data structures and the patterns every beginner should master first.', order: 1,
    sections: [
      { title: 'Arrays & Hashing', topics: [{ title: 'Hash maps and sets', slugs: ['two-sum', 'contains-duplicate', 'valid-anagram', 'group-anagrams'] }, { title: 'Array fundamentals', slugs: ['product-of-array-except-self', 'maximum-subarray'] }] },
      { title: 'Pointers & Windows', topics: [{ title: 'Two pointers', slugs: ['valid-palindrome', 'two-sum-ii-input-array-is-sorted', 'container-with-most-water'] }, { title: 'Sliding window', slugs: ['best-time-to-buy-and-sell-stock', 'longest-substring-without-repeating-characters'] }] },
      { title: 'Linear structures', topics: [{ title: 'Linked lists', slugs: ['reverse-linked-list', 'merge-two-sorted-lists', 'linked-list-cycle'] }, { title: 'Stacks', slugs: ['valid-parentheses', 'min-stack'] }] },
    ] },
  { title: 'Placement Preparation Roadmap', description: 'High-frequency questions asked in campus placement rounds.', order: 2,
    sections: [
      { title: 'Warm-up', topics: [{ title: 'Easy wins', slugs: ['two-sum', 'valid-parentheses', 'merge-two-sorted-lists', 'best-time-to-buy-and-sell-stock', 'climbing-stairs'] }] },
      { title: 'Medium essentials', topics: [{ title: 'Must-know mediums', slugs: ['3sum', 'group-anagrams', 'number-of-islands', 'coin-change', 'binary-tree-level-order-traversal', 'product-of-array-except-self'] }] },
    ] },
  { title: 'Arrays to Dynamic Programming', description: 'A guided climb from arrays and searching up to dynamic programming.', order: 3,
    sections: [
      { title: 'Foundations', topics: [{ title: 'Arrays & searching', slugs: ['maximum-subarray', 'binary-search', 'search-in-rotated-sorted-array', 'find-minimum-in-rotated-sorted-array'] }] },
      { title: 'Recursion & trees', topics: [{ title: 'Trees', slugs: ['maximum-depth-of-binary-tree', 'invert-binary-tree', 'validate-binary-search-tree'] }, { title: 'Backtracking', slugs: ['subsets', 'permutations', 'combination-sum'] }] },
      { title: 'Dynamic programming', topics: [{ title: '1D DP', slugs: ['climbing-stairs', 'house-robber', 'coin-change', 'longest-increasing-subsequence'] }, { title: '2D DP', slugs: ['longest-common-subsequence'] }] },
    ] },
  { title: 'Interview Preparation Roadmap', description: 'Level up for product-company interviews across graphs, heaps, tries and more.', order: 4,
    sections: [
      { title: 'Graphs & traversal', topics: [{ title: 'Graphs', slugs: ['number-of-islands', 'clone-graph', 'course-schedule'] }] },
      { title: 'Advanced structures', topics: [{ title: 'Heaps', slugs: ['kth-largest-element-in-an-array', 'find-median-from-data-stream', 'top-k-frequent-elements'] }, { title: 'Tries', slugs: ['implement-trie-prefix-tree', 'word-search-ii'] }, { title: 'Bit manipulation', slugs: ['single-number', 'number-of-1-bits', 'counting-bits'] }] },
      { title: 'Hard problems', topics: [{ title: 'Boss fights', slugs: ['median-of-two-sorted-arrays', 'word-search-ii'] }] },
    ] },
];

async function seedContent() {
  const bySlug = {};
  for (const q of QUESTIONS) {
    const doc = await Question.findOneAndUpdate(
      { slug: q.slug },
      { $setOnInsert: { ...q, leetcodeUrl: `https://leetcode.com/problems/${q.slug}/`, description: '', recommendedMinutes: q.difficulty === 'Easy' ? 20 : q.difficulty === 'Medium' ? 35 : 60 } },
      { upsert: true, new: true },
    );
    bySlug[q.slug] = doc;
  }
  for (const r of ROADMAPS) {
    if (await Roadmap.exists({ title: r.title })) continue;
    await Roadmap.create({
      title: r.title, description: r.description, order: r.order, published: true,
      slug: r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      sections: r.sections.map((s) => ({ title: s.title, topics: s.topics.map((t) => ({ title: t.title, questions: t.slugs.map((sl) => bySlug[sl]._id) })) })),
    });
  }
  // Schedule today + the next 13 days using a deterministic rotation (skips dates that already have a challenge).
  const pool = QUESTIONS.map((q) => bySlug[q.slug]._id);
  const start = todayKey();
  for (let i = 0; i < 14; i += 1) {
    const date = addDays(start, i);
    if (await DailyChallenge.exists({ date })) continue;
    await DailyChallenge.create({ date, questions: [pool[(i * 2) % pool.length], pool[(i * 2 + 1) % pool.length]], published: true });
  }
  console.log(`Seeded ${QUESTIONS.length} questions, ${ROADMAPS.length} roadmaps and 14 days of challenges.`);
}

async function seedDemoStudents() {
  const { Completion } = require('../models');
  const { PointsTransaction, Streak } = require('../models');
  const colleges = ['IIT Bombay', 'NIT Trichy', 'VIT Vellore', 'BITS Pilani', 'IIIT Hyderabad', 'Anna University'];
  const names = ['Aarav Sharma', 'Diya Patel', 'Rohan Iyer', 'Ananya Reddy', 'Kabir Singh', 'Meera Nair', 'Vihaan Gupta', 'Ishita Das'];
  const hash = await bcrypt.hash('Demo@12345', 10);
  const today = todayKey();
  for (let i = 0; i < names.length; i += 1) {
    const email = `demo${i + 1}@codesprint.demo`;
    if (await User.exists({ email })) continue;
    const u = await User.create({ name: `${names[i]} (demo)`, email, passwordHash: hash, college: colleges[i % colleges.length], graduationYear: 2026 + (i % 3), leetcodeUsername: `demo_user_${i + 1}`, bio: 'Demo account created by the seed script.' });
    const days = 3 + ((i * 3) % 9);
    let points = 0; let completed = 0;
    for (let d = days; d >= 1; d -= 1) {
      const date = addDays(today, -d);
      // Past demo history is written straight into the ledger/records (no past challenges exist), tagged as demo.
      const ch = await DailyChallenge.findOneAndUpdate({ date }, { $setOnInsert: { date, published: true, questions: [(await Question.findOne({ slug: 'two-sum' }))._id, (await Question.findOne({ slug: 'valid-parentheses' }))._id] } }, { upsert: true, new: true });
      for (let n = 0; n < 2; n += 1) {
        const qid = ch.questions[n];
        const q = await Question.findById(qid);
        await Completion.create({ user: u._id, question: qid, challenge: ch._id, date, difficulty: q.difficulty, order: n + 1, completedAt: new Date(Date.now() - d * 86400000) });
        const pts = n === 0 ? 10 : 15;
        await PointsTransaction.create({ user: u._id, points: pts, type: n === 0 ? 'FIRST_QUESTION' : 'SECOND_QUESTION', dedupeKey: `demo:${u._id}:${date}:${n}`, date, createdAt: new Date(Date.now() - d * 86400000) });
        points += pts; completed += 1;
      }
      await PointsTransaction.create({ user: u._id, points: 5, type: 'BOTH_BONUS', dedupeKey: `demo-bonus:${u._id}:${date}`, date, createdAt: new Date(Date.now() - d * 86400000) });
      points += 5;
    }
    await User.updateOne({ _id: u._id }, { totalPoints: points, totalCompleted: completed, 'completedByDifficulty.Easy': completed });
    await Streak.create({ user: u._id, current: days, longest: days, lastCompletedDate: addDays(today, -1), streakStartDate: addDays(today, -days), activeDays: days, perfectDays: days });
  }
  console.log('Seeded demo students (password: Demo@12345). These are DEMO records, not real users.');
}

(async () => {
  if (env.isProd && process.argv.includes('--demo')) { console.error('Refusing to seed demo data in production.'); process.exit(1); }
  await connectDB();
  await bootstrap();
  await seedContent();
  if (process.argv.includes('--demo')) await seedDemoStudents();
  await require('mongoose').disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
