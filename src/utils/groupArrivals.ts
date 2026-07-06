import type { TflArrival } from '../services/tflApi';
import type { DepartureRowData } from '../components/DepartureBoard';
import { formatTimeToStation } from './formatArrivalTime';
import { cleanDestinationName } from './cleanDestinationName';

export interface ArrivalBoard {
  /**
   * Platform/direction, e.g. "Southbound - Platform 4". Real indicators never print this on the
   * LED grid itself (you already know which platform you're standing on) — use it only for a
   * plain HTML caption around the board, not as the DepartureBoard `title` prop.
   */
  platformLabel: string;
  rows: DepartureRowData[];
  /** True when the soonest arrival on this platform is "Due" — row 3 should show the safety message instead of the carousel. */
  trainApproaching: boolean;
  /** Unique line ids serving this platform (soonest arrival's line first), e.g. ["circle", "district"]. */
  lineIds: string[];
}

/** 2 fixed rows + up to 3 more that cycle through row 3, matching the real boards. */
const MAX_ROWS_PER_BOARD = 5;

/** Groups a station's arrivals by platform (real boards are one panel per platform), soonest first. */
export function groupArrivalsByPlatform(arrivals: TflArrival[]): ArrivalBoard[] {
  const groups = new Map<string, TflArrival[]>();
  for (const arrival of arrivals) {
    const key = arrival.platformName || arrival.lineName;
    const group = groups.get(key);
    if (group) {
      group.push(arrival);
    } else {
      groups.set(key, [arrival]);
    }
  }

  return Array.from(groups.entries())
    .map(([platformLabel, group]) => {
      const sorted = group.slice().sort((a, b) => a.timeToStation - b.timeToStation);
      return {
        platformLabel,
        rows: sorted.slice(0, MAX_ROWS_PER_BOARD).map((a): DepartureRowData => ({
          // `towards` is TfL's own rider-facing display text, so branch lines already come
          // through as e.g. "Hainault via Newbury Park" — `destinationName` is just the
          // terminus and loses that disambiguation, so only fall back to it if `towards` is empty.
          destination: cleanDestinationName(a.towards || a.destinationName),
          time: formatTimeToStation(a.timeToStation),
        })),
        trainApproaching: (sorted[0]?.timeToStation ?? Infinity) <= 30,
        lineIds: [...new Set(sorted.map((a) => a.lineId))],
      };
    })
    .sort((a, b) => a.platformLabel.localeCompare(b.platformLabel));
}
