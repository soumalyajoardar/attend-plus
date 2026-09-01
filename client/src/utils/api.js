export const API_BASE =
  import.meta.env.VITE_API_BASE || 'https://attend-plus-server.onrender.com';

export function authHeaders() {
  try {
    const t = (window.localStorage.getItem('attendplus_token') ?? window.sessionStorage.getItem('attendplus_token'));
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch { return {}; }
}

export async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  return res;
}
