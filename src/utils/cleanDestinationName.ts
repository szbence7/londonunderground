const STATION_SUFFIXES = [/ underground station$/i, / rail station$/i, / dlr station$/i];

/** Real boards show just the destination ("Cockfosters"), never the raw API suffix ("...Underground Station"). */
export function cleanDestinationName(name: string): string {
  let cleaned = name;
  for (const suffix of STATION_SUFFIXES) {
    cleaned = cleaned.replace(suffix, '');
  }
  return cleaned.trim();
}
