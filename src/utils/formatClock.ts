const LONDON_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Formats a Date as UK local time ("HH:MM:SS", each part zero-padded to 2 characters),
 * regardless of the viewer's own timezone — real boards always show Britain's own clock
 * (GMT, or BST during daylight saving), never wherever the display happens to be viewed from.
 */
export function formatClock(date: Date): string {
  const parts = LONDON_TIME_FORMATTER.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('hour')}:${get('minute')}:${get('second')}`;
}
