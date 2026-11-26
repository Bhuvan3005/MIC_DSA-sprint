/**
 * Verifies a solve using the student's PUBLIC LeetCode profile data.
 *
 * Only public information is read (the username's recent accepted submissions). We never ask for
 * LeetCode passwords or session cookies. NOTE: LeetCode has no official public API; this uses the
 * same public GraphQL endpoint the website uses. It is unofficial and may change or rate-limit,
 * so the adapter FAILS CLOSED: if LeetCode can't be reached, nothing is verified and no points are given.
 */
const AppError = require('../../utils/AppError');
const { DateTime } = require('luxon');
const env = require('../../config/env');

const ENDPOINT = 'https://leetcode.com/graphql';
const QUERY = `query r($u: String!, $l: Int) {
  matchedUser(username: $u) { username }
  recentAcSubmissionList(username: $u, limit: $l) { title titleSlug timestamp }
}`;

async function defaultFetcher(username, limit = 50) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': 'CodeSprint-Verifier/1.0' },
      body: JSON.stringify({ query: QUERY, variables: { u: username, l: limit } }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new AppError(503, 'Could not reach LeetCode to verify your solve. Please try again in a minute.', 'LEETCODE_UNAVAILABLE');
  }
  if (!res.ok) throw new AppError(503, 'LeetCode is not responding right now. Please try again shortly.', 'LEETCODE_UNAVAILABLE');
  const json = await res.json().catch(() => null);
  if (!json || !json.data) throw new AppError(503, 'LeetCode returned an unexpected response. Please try again.', 'LEETCODE_UNAVAILABLE');
  return { exists: !!json.data.matchedUser, submissions: json.data.recentAcSubmissionList || [] };
}

let fetcher = defaultFetcher;
const setFetcher = (fn) => { fetcher = fn || defaultFetcher; };

/** Does this LeetCode username exist? Used at registration / profile edit. */
async function usernameExists(username) {
  const { exists } = await fetcher(username, 1);
  return exists;
}

module.exports = {
  method: 'LEETCODE_PUBLIC',
  setFetcher,
  usernameExists,

  /** Accepted submission of this problem made on the challenge date (platform timezone). */
  async verify({ user, question, date }) {
    if (!user.leetcodeUsername) {
      throw new AppError(400, 'Add your LeetCode username to your profile before recording solves.', 'LEETCODE_REQUIRED');
    }
    const { exists, submissions } = await fetcher(user.leetcodeUsername);
    if (!exists) {
      throw new AppError(422, `LeetCode user "${user.leetcodeUsername}" was not found. Check your username in your profile.`, 'LEETCODE_USER_NOT_FOUND');
    }
    const hit = submissions.find((s) => s.titleSlug === question.slug
      && DateTime.fromSeconds(Number(s.timestamp), { zone: env.PLATFORM_TIMEZONE }).toFormat('yyyy-MM-dd') === date);
    if (!hit) {
      throw new AppError(422, `We couldn't find an accepted submission for "${question.title}" by ${user.leetcodeUsername} today. Solve it on LeetCode, then try again (your LeetCode submissions must be public).`, 'NOT_VERIFIED');
    }
    return { method: 'LEETCODE_PUBLIC', status: 'verified', evidence: { titleSlug: hit.titleSlug, timestamp: Number(hit.timestamp) } };
  },
};
