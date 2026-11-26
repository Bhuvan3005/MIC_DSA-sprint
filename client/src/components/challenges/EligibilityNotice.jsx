import { Link } from 'react-router-dom';
import { ShieldAlert, UserX } from 'lucide-react';

/** Explains why a signed-in user can't record solves (admin account, or LeetCode username missing). */
export default function EligibilityNotice({ user }) {
  if (!user) return null;
  if (user.role === 'ADMIN') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-sky-450/30 bg-sky-450/10 p-4 text-sm text-sky-100">
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <div>You’re signed in as an administrator. Admin activity isn’t counted towards points, streaks or the leaderboard. Use a student account to take part.</div>
      </div>
    );
  }
  if (!user.leetcodeUsername) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <UserX size={18} className="mt-0.5 shrink-0" />
        <div>Add your LeetCode username to your <Link to="/profile" className="font-semibold underline">profile</Link> so we can verify your solves.</div>
      </div>
    );
  }
  return null;
}
