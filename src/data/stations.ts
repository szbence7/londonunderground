import londonUndergroundStations from './londonUndergroundStations.json';

export interface StationOption {
  id: string;
  name: string;
  lineIds: string[];
}

/**
 * All 272 London Underground stations, snapshotted from GET /StopPoint/Mode/tube
 * (id = the naptanId used by /StopPoint/{id}/Arrivals, name = commonName with the
 * "Underground Station" suffix stripped). Static rather than fetched at runtime so the
 * combobox works instantly and doesn't spend API rate limit on every page load.
 *
 * Regenerate with `node scripts/fetchStations.mjs` if new stations open (e.g. line extensions).
 */
export const SEED_STATIONS: StationOption[] = londonUndergroundStations;
