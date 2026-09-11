/** Game calendar: four production weeks per month, 48 weeks per year.
 * Month fields are retained so older save files keep their original history.
 */
export const WEEKS_PER_MONTH = 4;
export const weekOf = s => Number.isInteger(s.week) ? s.week : s.month * WEEKS_PER_MONTH;
export const weekDate = w => {
  const n = Math.max(0, Math.floor(w));
  return `${2026 + Math.floor(n / 48)}년 ${Math.floor(n % 48 / 4) + 1}월 ${n % 4 + 1}주`;
};
export const recordDate = r => Number.isInteger(r.week) ? weekDate(r.week) : `${2026 + Math.floor(r.month / 12)}년 ${r.month % 12 + 1}월`;
export function initClock(s) {
  s.week ??= s.month * 4;
  s.notifications ??= [];
  s.notificationCounter ??= 0;
  for (const c of s.companies) c.lastReleaseWeek ??= c.lastRelease * 4;
  for (const f of s.films) initFilmClock(s, f);
}
export function initFilmClock(s, f) {
  f.startWeek ??= f.start * 4;
  f.elapsedWeeks ??= Math.round((f.elapsed || 0) * 4);
  f.reshootElapsedWeeks ??= Math.round((f.reshootElapsed || 0) * 4);
  if (f.reshootStart != null) f.reshootStartWeek ??= f.reshootStart * 4;
  if (f.releaseMonth != null) f.releaseWeek ??= f.releaseMonth * 4;
  if (f.readyMonth != null) f.readyWeek ??= f.readyMonth * 4;
  if (f.closeMonth != null) f.closeWeek ??= f.closeMonth * 4;
  if (f.runs.length && f.lastWeekAudience == null) {
    f.lastWeekAudience = Math.round(f.lastAudience / 4);
    f.openingWeekAudience = Math.max(1, Math.round(f.openingAudience / 4));
  }
}
/** Notifications are saved, keyed and de-duplicated, not ephemeral DOM messages. */
export function notify(s, { key, title, text, type = 'info', filmId = null, action = null, ...details }) {
  s.notifications ??= [];
  s.notificationCounter ??= 0;
  if (s.notifications.some(n => n.key === key)) return null;
  const item = { id: ++s.notificationCounter, key, week: weekOf(s), title, text, type, filmId, action, unread: true, popup: true, ...details };
  s.notifications.unshift(item);
  s.notifications = s.notifications.slice(0, 500);
  return item;
}
export const releaseWaitWeeks = (s, company = 'c0') => {
  const c = s.companies.find(x => x.id === company);
  return Math.max(0, 8 - (weekOf(s) - (c.lastReleaseWeek ?? c.lastRelease * 4)));
};
