import { useEffect, useMemo, useRef } from 'react';

// GitHub's dark contribution scale: empty, then four greens from dim to bright.
const LEVELS = ['bg-white/[0.06]', 'bg-[#0e4429]', 'bg-[#006d32]', 'bg-[#26a641]', 'bg-[#39d353]'];
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LABEL_W = 30;

/** 0 = nothing; 4 = the whole day finished. Scales with the number of daily questions. */
const levelOf = (count, perDay) => {
  if (!count) return 0;
  const r = count / Math.max(1, perDay);
  return r >= 1 ? 4 : r > 0.66 ? 3 : r > 0.33 ? 2 : 1;
};

const pretty = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** GitHub-style contribution grid for the last ~53 weeks. `data` = [{date:'YYYY-MM-DD', count}] */
export default function Heatmap({ data = [], today, perDay = 2 }) {
  const scroller = useRef(null);
  const { weeks, months, total, activeDays } = useMemo(() => {
    const map = new Map(data.map((d) => [d.date, d.count]));
    const end = today ? new Date(`${today}T00:00:00`) : new Date();
    const start = new Date(end); start.setDate(start.getDate() - 52 * 7 - end.getDay());
    const weeks = []; const months = []; let total = 0; let activeDays = 0; let lastMonth = -1;
    for (let w = 0; w < 53; w += 1) {
      const col = [];
      for (let d = 0; d < 7; d += 1) {
        const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        const future = dt > end;
        const count = future ? 0 : map.get(key) || 0;
        total += count; if (count) activeDays += 1;
        col.push({ key, count, future });
        if (d === 0 && dt.getMonth() !== lastMonth && !future) { months.push({ w, label: dt.toLocaleString('en', { month: 'short' }) }); lastMonth = dt.getMonth(); }
      }
      weeks.push(col);
    }
    return { weeks, months, total, activeDays };
  }, [data, today]);

  // Start scrolled to the most recent weeks, like GitHub.
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth; }, [weeks]);

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto pb-2">
        <div className="inline-flex min-w-max gap-2">
          <div className="text-[10px] leading-none text-zinc-500" style={{ width: LABEL_W, paddingTop: 20 }} aria-hidden="true">
            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => <div key={i} style={{ height: CELL, marginBottom: GAP }} className="flex items-center">{l}</div>)}
          </div>
          <div>
            <div className="relative mb-1 h-4 text-[10px] text-zinc-500" aria-hidden="true">
              {months.map((m) => <span key={m.w} className="absolute" style={{ left: m.w * STEP }}>{m.label}</span>)}
            </div>
            <div className="flex" style={{ gap: GAP }} role="img" aria-label={`Activity: ${total} problems solved on ${activeDays} days in the last year`}>
              {weeks.map((col, i) => (
                <div key={i} className="flex flex-col" style={{ gap: GAP }}>
                  {col.map((c) => (
                    <div key={c.key} title={c.future ? '' : `${c.count} ${c.count === 1 ? 'problem' : 'problems'} on ${pretty(c.key)}`}
                      style={{ width: CELL, height: CELL }}
                      className={`hm-cell rounded-[3px] ${c.future ? 'opacity-0' : LEVELS[levelOf(c.count, perDay)]}`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>{total} problems solved on {activeDays} {activeDays === 1 ? 'day' : 'days'} in the last year</span>
        <span className="flex items-center gap-1.5">Less {LEVELS.map((l) => <i key={l} className={`inline-block rounded-[3px] ${l}`} style={{ width: CELL, height: CELL }} />)} More</span>
      </div>
    </div>
  );
}
