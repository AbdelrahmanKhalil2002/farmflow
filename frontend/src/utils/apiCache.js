const PREFIX = 'ff_cache:';
const MAX_AGE_MS = 10 * 60 * 1000; // 10 min

function cacheKey(url, params) {
  return PREFIX + url + (params ? '?' + new URLSearchParams(params).toString() : '');
}

export function cacheGet(url, params) {
  try {
    const raw = localStorage.getItem(cacheKey(url, params));
    if (!raw) return null;
    return JSON.parse(raw); // { data, ts }
  } catch {
    return null;
  }
}

export function cacheSet(url, params, data) {
  try {
    localStorage.setItem(cacheKey(url, params), JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Quota exceeded — silently skip
  }
}

export function isStale(ts) {
  return Date.now() - ts > MAX_AGE_MS;
}
