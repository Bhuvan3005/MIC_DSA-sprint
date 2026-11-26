/** API-served files (like profile pictures) come back as root-relative paths; prefix the API origin if it differs. */
export const assetUrl = (path) => (path ? `${import.meta.env.VITE_API_URL || ''}${path}` : null);

export const cn = (...c) => c.filter(Boolean).join(' ');

export const TOPICS = ['Arrays', 'Strings', 'Hashing', 'Two Pointers', 'Sliding Window', 'Binary Search', 'Linked Lists',
  'Stacks', 'Queues', 'Trees', 'Graphs', 'Greedy', 'Backtracking', 'Dynamic Programming', 'Heaps', 'Tries', 'Bit Manipulation'];
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
export const COLLEGES = [
  'IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kanpur', 'IIT Kharagpur', 'NIT Trichy', 'NIT Surathkal', 'NIT Warangal',
  'BITS Pilani', 'IIIT Hyderabad', 'IIIT Delhi', 'VIT Vellore', 'SRM Institute of Science and Technology',
  'Manipal Institute of Technology', 'Delhi Technological University', 'NSUT Delhi', 'PSG College of Technology',
  'College of Engineering Pune', 'Jadavpur University', 'Anna University', 'Amity University', 'Other',
];

export const difficultyStyle = {
  Easy: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  Medium: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  Hard: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

export const formatDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-IN', opts) : '-';

export const formatDuration = (s = 0) => {
  const m = Math.floor(s / 60); const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export const formatBytes = (b = 0) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${(b / 1e6).toFixed(1)} MB`);
export const initials = (name = '?') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export const parseTimestamp = (txt) => {
  const parts = String(txt).trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
};

export const slugFromLeetcodeUrl = (url) => {
  const m = String(url).match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : '';
};
