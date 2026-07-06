import { useEffect, useRef, useState } from 'react';
import { getArrivals, type TflArrival } from '../services/tflApi';

const DEFAULT_POLL_INTERVAL_MS = 25_000;

export interface UseTflArrivalsOptions {
  pollIntervalMs?: number;
}

export interface UseTflArrivalsResult {
  arrivals: TflArrival[];
  loading: boolean;
  error: string | null;
}

/** Polls TfL's live arrivals for a station every `pollIntervalMs` (default 25s). */
export function useTflArrivals(
  stationId: string | null,
  { pollIntervalMs = DEFAULT_POLL_INTERVAL_MS }: UseTflArrivalsOptions = {},
): UseTflArrivalsResult {
  const [arrivals, setArrivals] = useState<TflArrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!stationId) {
      setArrivals([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const seq = ++requestSeq.current;

    async function poll() {
      try {
        const data = await getArrivals(stationId as string);
        if (cancelled || seq !== requestSeq.current) return;
        setArrivals(data.slice().sort((a, b) => a.timeToStation - b.timeToStation));
        setError(null);
      } catch (err) {
        if (cancelled || seq !== requestSeq.current) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch arrivals');
      } finally {
        if (!cancelled && seq === requestSeq.current) setLoading(false);
      }
    }

    setLoading(true);
    poll();
    const interval = setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stationId, pollIntervalMs]);

  return { arrivals, loading, error };
}
