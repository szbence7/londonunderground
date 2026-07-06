const TFL_BASE_URL = 'https://api.tfl.gov.uk';

/** Shape of a single entry returned by GET /StopPoint/{id}/Arrivals */
export interface TflArrival {
  id: string;
  vehicleId: string;
  naptanId: string;
  stationName: string;
  lineId: string;
  lineName: string;
  platformName: string;
  direction: string;
  destinationName: string;
  towards: string;
  /** seconds until the vehicle reaches this stop */
  timeToStation: number;
  expectedArrival: string;
  modeName: string;
}

/** Shape of a station/stop entry returned by /StopPoint/Mode/{mode} and /StopPoint/Search */
export interface TflStopPoint {
  id: string;
  commonName: string;
  modes: string[];
  lat: number;
  lon: number;
}

/** One status entry within GET /Line/{ids}/Status, e.g. "Good Service" or a disruption. */
export interface TflLineStatus {
  statusSeverity: number;
  statusSeverityDescription: string;
  reason?: string;
}

/** Shape of a single entry returned by GET /Line/{ids}/Status */
export interface TflLine {
  id: string;
  name: string;
  lineStatuses: TflLineStatus[];
}

function appKeyParam(): string {
  const key = import.meta.env.VITE_TFL_APP_KEY as string | undefined;
  return key ? `app_key=${key}` : '';
}

function withAppKey(url: string): string {
  const keyParam = appKeyParam();
  if (!keyParam) return url;
  return url + (url.includes('?') ? '&' : '?') + keyParam;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(withAppKey(`${TFL_BASE_URL}${path}`));
  if (!res.ok) {
    throw new Error(`TfL API request failed: ${res.status} ${res.statusText} (${path})`);
  }
  return res.json() as Promise<T>;
}

/** Live arrival predictions for a stop point (station/platform), e.g. naptanId "940GZZLUCFS". */
export function getArrivals(stopPointId: string): Promise<TflArrival[]> {
  return getJson<TflArrival[]>(`/StopPoint/${encodeURIComponent(stopPointId)}/Arrivals`);
}

/** All stop points for a given mode, e.g. "tube", "dlr", "overground", "elizabeth-line". */
export function getStopPointsByMode(mode: string): Promise<{ stopPoints: TflStopPoint[] }> {
  return getJson<{ stopPoints: TflStopPoint[] }>(`/StopPoint/Mode/${encodeURIComponent(mode)}`);
}

/** Free-text station search, used to back the station combobox. */
export function searchStopPoints(query: string): Promise<{ matches: TflStopPoint[] }> {
  return getJson<{ matches: TflStopPoint[] }>(
    `/StopPoint/Search/${encodeURIComponent(query)}?modes=tube,dlr,overground,elizabeth-line`,
  );
}

/** Current service status (and any disruption reason) for one or more line ids, e.g. "piccadilly". */
export function getLineStatus(lineIds: string[]): Promise<TflLine[]> {
  if (lineIds.length === 0) return Promise.resolve([]);
  return getJson<TflLine[]>(`/Line/${lineIds.map(encodeURIComponent).join(',')}/Status`);
}
