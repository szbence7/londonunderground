/** Formats a TfL `timeToStation` (seconds) the way real boards do: "Due", "1 min", or "N mins". */
export function formatTimeToStation(seconds: number): string {
  if (seconds <= 30) return 'Due';
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? '1 min' : `${minutes} mins`;
}
