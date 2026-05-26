// server/src/utils/dateUtils.js
// Slot helpers and timezone formatting for IST (Asia/Kolkata, UTC+5:30)

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h30m in ms

/**
 * addMinutes — returns a new Date shifted by N minutes
 */
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * formatIST — converts a UTC Date/ISO string to human-readable IST string
 * e.g. "2:30 PM" (time only) or "26 May, 2:30 PM" (with date)
 */
function formatIST(date, includeDate = false) {
  const d = new Date(date);
  const ist = new Date(d.getTime() + IST_OFFSET_MS);

  const hours   = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const ampm    = hours >= 12 ? 'PM' : 'AM';
  const h12     = hours % 12 || 12;
  const mm      = String(minutes).padStart(2, '0');
  const time    = `${h12}:${mm} ${ampm}`;

  if (!includeDate) return time;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${ist.getUTCDate()} ${months[ist.getUTCMonth()]}, ${time}`;
}

/**
 * toISTDate — given a Date, returns 'YYYY-MM-DD' in IST timezone
 */
function toISTDate(date) {
  const d   = new Date(date);
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10);
}

/**
 * getDateRange — returns { start: Date, end: Date } for a given IST date string
 * Start = 00:00:00 IST = 18:30:00 UTC previous day
 * End   = 23:59:59 IST = 18:29:59 UTC same day
 */
function getDateRange(dateStr) {
  // dateStr = 'YYYY-MM-DD' in IST
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end   = new Date(`${dateStr}T23:59:59+05:30`);
  return { start, end };
}

/**
 * generateSlots — generate time slots for a given IST date
 * @param {string} dateStr     — 'YYYY-MM-DD'
 * @param {number} durationMin — slot duration in minutes
 * @param {number} openHour    — salon open hour in IST (default 9)
 * @param {number} closeHour   — salon close hour in IST (default 20)
 * @returns {Array<{ start: Date, end: Date }>}
 */
function generateSlots(dateStr, durationMin = 30, openHour = 9, closeHour = 20) {
  const slots = [];
  let current = new Date(`${dateStr}T${String(openHour).padStart(2,'0')}:00:00+05:30`);
  const close = new Date(`${dateStr}T${String(closeHour).padStart(2,'0')}:00:00+05:30`);

  while (current < close) {
    const end = addMinutes(current, durationMin);
    if (end > close) break;
    slots.push({ start: new Date(current), end });
    current = addMinutes(current, durationMin);
  }
  return slots;
}

/**
 * isValidDateString — checks 'YYYY-MM-DD' format
 */
function isValidDateString(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime());
}

module.exports = { addMinutes, formatIST, toISTDate, getDateRange, generateSlots, isValidDateString };
