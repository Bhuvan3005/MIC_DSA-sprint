import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { adminApi } from '../../services';
import { useDebounced } from '../../hooks/useFetch';
import { DifficultyBadge, Spinner } from '../common/ui';

/** Searchable single question selector backed by the question bank. */
export function QuestionPicker({ value, onChange, excludeIds = [], placeholder = 'Search question bank…', disabled }) {
  const [text, setText] = useState('');
  const q = useDebounced(text, 250);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setBusy(true);
    adminApi.questions({ search: q, limit: 8 }).then((r) => live && setResults(r.items)).catch(() => live && setResults([])).finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [q, open]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-ink-500 bg-ink-900/80 px-3.5 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2"><span className="truncate font-medium text-white">{value.title}</span><DifficultyBadge level={value.difficulty} /></span>
        {!disabled && <button type="button" onClick={() => onChange(null)} aria-label="Clear selection" className="text-slate-400 hover:text-white"><X size={16} /></button>}
      </div>
    );
  }
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input className="input !pl-9" placeholder={placeholder} value={text} disabled={disabled}
        onFocus={() => setOpen(true)} onChange={(e) => { setText(e.target.value); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-ink-500 bg-ink-800 p-1 shadow-2xl">
          {busy && <li className="flex justify-center p-3"><Spinner /></li>}
          {!busy && results.filter((r) => !excludeIds.includes(r.id)).length === 0 && <li className="p-3 text-sm text-slate-500">No matching questions</li>}
          {results.filter((r) => !excludeIds.includes(r.id)).map((r) => (
            <li key={r.id}><button type="button" onMouseDown={() => { onChange(r); setText(''); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-600">
              <span className="truncate">{r.number ? `${r.number}. ` : ''}{r.title}</span><DifficultyBadge level={r.difficulty} /></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DataTable({ columns, rows, empty, rowKey = (r) => r.id }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b border-ink-500/60 text-left text-xs uppercase tracking-wider text-slate-400">
            {columns.map((c) => <th key={c.key} className={`px-4 py-3 font-semibold ${c.className || ''}`}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">{empty || 'Nothing here yet'}</td></tr>}
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-ink-500/30 transition hover:bg-ink-700/40">
                {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${c.className || ''}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const StatusPill = ({ tone = 'slate', children }) => {
  const tones = {
    emerald: 'bg-emerald-500/15 text-emerald-300', amber: 'bg-amber-500/15 text-amber-300', sky: 'bg-sky-450/15 text-sky-300',
    rose: 'bg-rose-500/15 text-rose-300', slate: 'bg-ink-600 text-slate-300', brand: 'bg-brand-500/15 text-brand-400',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
};
