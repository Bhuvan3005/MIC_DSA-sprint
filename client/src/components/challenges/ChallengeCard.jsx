import { Check, Clock, ExternalLink, PlayCircle, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DifficultyBadge, Spinner } from '../common/ui';
import Button from '../common/Button';
import { cn } from '../../utils/format';

// Artwork tint by difficulty, with one large hexagon outline (from the logo) cropped into the corner.
const TINT = { Easy: 'bg-emerald-400/[0.12] text-emerald-300', Medium: 'bg-amber-400/[0.12] text-amber-300', Hard: 'bg-rose-400/[0.12] text-rose-300' };
const HEX = '50,3 94,27 94,73 50,97 6,73 6,27';

/**
 * One assigned problem as a tile: dotted artwork with the problem's number, then topic, title and time.
 * "Solve" opens LeetCode in a new tab; "I solved it" asks the server to verify an accepted submission on the
 * student's public LeetCode profile before anything is recorded.
 */
export default function ChallengeCard({ question: q, onComplete, busy, readOnly, index, blocked }) {
  return (
    <article className={cn('card flex flex-col rounded-[28px] p-3 transition-colors', q.completed && 'border-emerald-400/25')}>
      <div className={cn('relative flex h-40 flex-col justify-between overflow-hidden rounded-[22px] p-4', q.completed ? 'bg-emerald-400/[0.14] text-emerald-300' : TINT[q.difficulty] || 'bg-white/[0.06] text-zinc-300')}>
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute -right-10 -top-8 h-56 w-56 opacity-[0.22]" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden="true">
          <polygon points={HEX} />
          <polygon points="50,19 80,36 80,64 50,81 20,64 20,36" opacity="0.6" />
        </svg>
        <div className="relative flex items-start justify-between">
          <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium text-white/80">{q.number ? `LeetCode #${q.number}` : 'Problem'}</span>
          {q.completed && <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400 text-ink-900" aria-label="Solved"><Check size={17} strokeWidth={3} /></span>}
        </div>
        <div className="relative flex items-end justify-between">
          <span className="font-heading text-6xl font-light leading-none text-white/90" aria-hidden="true">{String((index ?? 0) + 1).padStart(2, '0')}</span>
          <DifficultyBadge level={q.difficulty} />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-2 pt-4">
        {q.topics?.length > 0 && <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Tag size={12} />{q.topics.slice(0, 3).join(' · ')}</div>}
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <h3 className={cn('text-lg font-semibold leading-snug', q.completed && 'text-zinc-400')}>{q.title}</h3>
          <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs text-zinc-400"><Clock size={13} />~{q.recommendedMinutes} min</span>
        </div>
        {q.description && <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{q.description}</p>}
        {q.hasVideo && <Link to={`/videos/${q.slug}`} className="mt-2 inline-flex items-center gap-1 text-xs text-brand-400 hover:underline"><PlayCircle size={13} />Watch the video solution</Link>}

        {!readOnly && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            {q.completed ? (
              <span className="text-sm font-medium text-emerald-400">Done · verified on LeetCode</span>
            ) : (
              <>
                <Button href={q.leetcodeUrl} target="_blank" variant="primary">Solve <ExternalLink size={14} /></Button>
                <Button variant="ghost" disabled={blocked} onClick={() => onComplete?.(q)}>
                  {busy ? <Spinner /> : null}{busy ? 'Verifying' : 'I solved it'}
                </Button>
              </>
            )}
          </div>
        )}
        {readOnly && q.completed && <span className="mt-4 text-sm font-medium text-emerald-400">Verified</span>}
      </div>
    </article>
  );
}
