import { useEffect, useState } from 'react';
import { getLineStatus } from '../services/tflApi';

const POLL_INTERVAL_MS = 60_000;
const GOOD_SERVICE = 'Good Service';

/**
 * Polls TfL's line status for `lineIds` and returns the first disruption message found, if any —
 * real boards show this kind of service message (not just next-train times) when a line isn't
 * running a good service. Returns null when every line is running normally or there are none.
 */
export function useLineStatus(lineIds: string[]): string | null {
  const [message, setMessage] = useState<string | null>(null);
  const key = lineIds.join(',');

  useEffect(() => {
    if (lineIds.length === 0) {
      setMessage(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const lines = await getLineStatus(lineIds);
        if (cancelled) return;
        const disrupted = lines.find((line) =>
          line.lineStatuses.some((s) => s.statusSeverityDescription !== GOOD_SERVICE),
        );
        const status = disrupted?.lineStatuses.find((s) => s.statusSeverityDescription !== GOOD_SERVICE);
        setMessage(status ? status.reason || status.statusSeverityDescription : null);
      } catch {
        if (!cancelled) setMessage(null);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return message;
}
