// ---------------------------------------------------------------------------
// Attend+ auth/storage helper
// ---------------------------------------------------------------------------
// "Remember Me" support: when checked at login, session data is written to
// localStorage (survives closing the browser/tab). When unchecked, it's
// written to sessionStorage only (cleared once the tab/browser closes).
// Every reader below checks localStorage first, then falls back to
// sessionStorage, so the rest of the app doesn't need to care which one was
// used.

const KEYS = ['attendplus_token', 'attendplus_role', 'attendplus_user'];

export function saveSession({ token, role, user }, remember) {
  const store = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;

  store.setItem('attendplus_token', token);
  store.setItem('attendplus_role', role);
  store.setItem('attendplus_user', JSON.stringify(user));
  store.setItem('attendplus_remember', remember ? '1' : '0');

  // Make sure there isn't stale data left in the other storage.
  other.removeItem('attendplus_token');
  other.removeItem('attendplus_role');
  other.removeItem('attendplus_user');
  other.removeItem('attendplus_remember');
}

export function getItem(key) {
  return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
}

export function getToken() {
  return getItem('attendplus_token');
}

export function getRole() {
  return getItem('attendplus_role');
}

export function getUser() {
  try {
    return JSON.parse(getItem('attendplus_user') || '{}');
  } catch {
    return {};
  }
}

export function isRemembered() {
  return window.localStorage.getItem('attendplus_remember') === '1' && !!window.localStorage.getItem('attendplus_token');
}

// True if there is a valid session in EITHER storage (used to guard routes).
export function isAuthed(role) {
  const r = getRole();
  const t = getToken();
  return !!t && (!role || r === role);
}

export function clearSession() {
  KEYS.concat('attendplus_remember').forEach((k) => {
    window.localStorage.removeItem(k);
    window.sessionStorage.removeItem(k);
  });
}
