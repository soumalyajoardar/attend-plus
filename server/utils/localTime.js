// ---------------------------------------------------------------------------
// Institution-local date/time strings
// ---------------------------------------------------------------------------
// Attendance rows carry a human-readable `date` ("2026-08-25") and `time`
// ("9:30:00 AM") alongside the machine-readable `timestamp`. Those two strings
// used to be produced with `new Date().toISOString().split('T')[0]` and
// `new Date().toLocaleTimeString()`, which read the *server's* clock and locale.
// In production the server is Render, which runs in UTC — so a 9:30 AM class in
// Kolkata was being filed as "04:00:00", and anything after 5:30 PM IST was
// filed under the previous day's date.
//
// An attendance register is a record of the institution's working day, not of
// whichever timezone the host happens to sit in, so we format in one fixed zone
// for everyone. Set INSTITUTION_TZ in the environment to move it; the default
// is Asia/Kolkata.
//
// `timestamp` stays a real UTC Date and is unaffected — that remains the source
// of truth for ordering and for any future recalculation.

const FALLBACK_TZ = 'Asia/Kolkata';

// An unrecognised IANA name makes Intl.DateTimeFormat throw a RangeError, and a
// throwing schema default would break every check-in. Validate once at load and
// fall back loudly rather than at 9 AM on a Monday.
function resolveZone() {
  const configured = process.env.INSTITUTION_TZ;
  if (!configured) return FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: configured });
    return configured;
  } catch {
    console.warn(
      `[localTime] INSTITUTION_TZ="${configured}" is not a valid IANA timezone. Falling back to ${FALLBACK_TZ}.`
    );
    return FALLBACK_TZ;
  }
}

const TIME_ZONE = resolveZone();

// Built once — constructing a DateTimeFormat is the expensive part, and these
// run on every attendance insert.
const dateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// 'en-US' + hour12 keeps the "9:30:00 AM" shape the dashboards already render,
// so only the value changes, not the layout.
const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

// "2026-08-25" in the institution's timezone. Built from formatToParts rather
// than string-splitting a formatted date so it can't be broken by locale order.
function localDate(when = new Date()) {
  const parts = {};
  for (const { type, value } of dateParts.formatToParts(when)) {
    parts[type] = value;
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// "9:30:00 AM" in the institution's timezone.
function localTime(when = new Date()) {
  return timeFormat.format(when);
}

module.exports = { localDate, localTime, TIME_ZONE };
