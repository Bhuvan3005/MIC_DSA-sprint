import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async loader and tracks loading/error state. Re-runs when deps change; ignores stale responses. */
export function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const seq = useRef(0);

  const run = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    return Promise.resolve(loader())
      .then((data) => { if (id === seq.current) setState({ data, loading: false, error: null }); return data; })
      .catch((error) => { if (id === seq.current) setState((s) => ({ data: s.data, loading: false, error })); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
