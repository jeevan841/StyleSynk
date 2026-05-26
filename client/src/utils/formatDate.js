// client/src/utils/formatDate.js
// Date/time formatting helpers for IST display

const IST_OPTIONS = { timeZone: 'Asia/Kolkata' };

/**
 * formatDate — e.g. "26 May 2026"
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    ...IST_OPTIONS,
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * formatTime — e.g. "2:30 PM"
 */
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', {
    ...IST_OPTIONS,
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/**
 * formatDateTime — e.g. "26 May, 2:30 PM"
 */
export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-IN', {
    ...IST_OPTIONS,
    day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/**
 * toInputDateTime — converts Date to "YYYY-MM-DDTHH:mm" for datetime-local inputs
 */
export function toInputDateTime(date) {
  const d   = new Date(date);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 16);
}

/**
 * fromInputDateTime — converts datetime-local value to ISO string
 */
export function fromInputDateTime(value) {
  return new Date(value + ':00+05:30').toISOString();
}

/**
 * isToday — returns true if date is today in IST
 */
export function isToday(date) {
  const d = new Date(date).toLocaleDateString('en-CA', IST_OPTIONS); // YYYY-MM-DD
  const t = new Date().toLocaleDateString('en-CA', IST_OPTIONS);
  return d === t;
}

/**
 * relativeTime — "5 min ago", "in 2 hours", etc.
 */
export function relativeTime(date) {
  const now  = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.round((then - now) / 60000); // minutes

  if (Math.abs(diff) < 1)   return 'just now';
  if (diff === -1)           return '1 min ago';
  if (diff < 0 && diff > -60) return `${-diff} min ago`;
  if (diff < 0)              return `${Math.round(-diff/60)}h ago`;
  if (diff === 1)            return 'in 1 min';
  if (diff < 60)             return `in ${diff} min`;
  return `in ${Math.round(diff/60)}h`;
}

export default formatDateTime;
