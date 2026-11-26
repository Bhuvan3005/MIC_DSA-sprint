import { useRef, useState } from 'react';
import { ListVideo } from 'lucide-react';
import { formatDuration } from '../../utils/format';
import { cn } from '../../utils/format';

/** Plays a Cloudinary secure URL with clickable chapter timestamps. */
export default function VideoPlayer({ src, poster, chapters = [] }) {
  const ref = useRef(null);
  const [now, setNow] = useState(0);
  const seek = (t) => { if (ref.current) { ref.current.currentTime = t; ref.current.play().catch(() => {}); } };
  const active = [...chapters].reverse().find((c) => now >= c.startSeconds);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-2xl border border-ink-500/60 bg-black">
        <video ref={ref} src={src} poster={poster} controls preload="metadata" playsInline className="aspect-video w-full"
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} />
      </div>
      {chapters.length > 0 && (
        <aside className="card max-h-[420px] overflow-y-auto p-3">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><ListVideo size={14} />Chapters</div>
          <ul>
            {chapters.map((c) => (
              <li key={`${c.startSeconds}-${c.title}`}>
                <button onClick={() => seek(c.startSeconds)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-ink-600',
                    active?.startSeconds === c.startSeconds && 'bg-brand-500/15 text-white')}>
                  <span className="font-mono text-xs text-brand-400">{formatDuration(c.startSeconds)}</span>
                  <span className="flex-1 truncate">{c.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
