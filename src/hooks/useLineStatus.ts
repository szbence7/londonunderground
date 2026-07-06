import { useEffect, useState } from 'react';
import { getLineStatus } from '../services/tflApi';

const POLL_INTERVAL_MS = 60_000;
const GOOD_SERVICE = 'Good Service';

/**
 * Polls TfL's line status for `lineId` and returns the current disruption message, if any —
 * real boards show this kind of service message (not just next-train times) when a line isn't
 * running a good service. Returns null when the service is running normally or there's no line.
 */
export function useLineStatus(lineId: string | null): string | null {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!lineId) {
      setMessage(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const lines = await getLineStatus([lineId as string]);
        if (cancelled) return;
        const status = lines[0]?.lineStatuses?.[0];
        if (!status || status.statusSeverityDescription === GOOD_SERVICE) {
          setMessage(null);
        } else {
          setMessage(status.reason || status.statusSeverityDescription);
        }
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
  }, [lineId]);

  return message;
}
