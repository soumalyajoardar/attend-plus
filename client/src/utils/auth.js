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

  safeSet(store, 'attendplus_token', token);
  safeSet(store, 'attendplus_role', role);
  safeSet(store, 'attendplus_user', JSON.stringify(user));
  safeSet(store, 'attendplus_remember', remember ? '1' : '0');

  safeRemove(other, 'attendplus_token');
  safeRemove(other, 'attendplus_role');
  safeRemove(other, 'attendplus_user');
  safeRemove(other, 'attendplus_remember');
}

function safeGet(store, key) {
  try { return store.getItem(key); } catch { return null; }
}
function safeSet(store, key, val) {
  try { store.setItem(key, val); } catch {}
}
function safeRemove(store, key) {
  try { store.removeItem(key); } catch {}
}

export function getItem(key) {
  try {
    return safeGet(window.localStorage, key) ?? safeGet(window.sessionStorage, key);
  } catch { return null; }
}

export function getToken() {
  return getItem('attendplus_token');
}

export function getRole() {
  return getItem('attendplus_role');
}

export function getUser() {
  try {
    const raw = getItem('attendplus_user');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function isRemembered() {
  return safeGet(window.localStorage, 'attendplus_remember') === '1' && !!safeGet(window.localStorage, 'attendplus_token');
}

// True if there is a valid session in EITHER storage (used to guard routes).
// Also validates JWT expiry if token is a JWT.
export function isAuthed(role) {
  const r = getRole();
  const t = getToken();
  if (!t) return false;
  if (role && r !== role) return false;
  // Check expiry for real JWTs (skip demo tokens that are not JWTs)
  const parts = t.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp && Date.now() >= payload.exp * 1000) return false;
    } catch {}
  }
  return true;
}

export function clearSession() {
  KEYS.concat('attendplus_remember').forEach((k) => {
    safeRemove(window.localStorage, k);
    safeRemove(window.sessionStorage, k);
  });
}
