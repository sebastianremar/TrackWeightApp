const TIMEOUT = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];

function isRetryable(status) {
  return status >= 500 || status === 429;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function api(url, options = {}) {
  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, fetchOptions);

      if (res.status === 401) {
        throw new Error('Session expired');
      }

      if (attempt < MAX_RETRIES && isRetryable(res.status)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error('Request timed out');
      } else {
        lastError = err;
      }

      // Don't retry auth errors or client errors
      if (lastError.message === 'Session expired') throw lastError;

      // Retry on network errors / timeouts
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
    }
  }

  throw lastError;
}
