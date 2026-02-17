import * as SecureStore from 'expo-secure-store';

// TODO: Update this to your production API URL
const BASE_URL = 'https://trackmyweight.net';

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

export async function getToken() {
  return SecureStore.getItemAsync('authToken');
}

export async function setToken(token) {
  return SecureStore.setItemAsync('authToken', token);
}

export async function clearToken() {
  return SecureStore.deleteItemAsync('authToken');
}

export async function api(path, options = {}) {
  const token = await getToken();

  const fetchOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}${path}`, fetchOptions);

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

      if (lastError.message === 'Session expired') throw lastError;

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
    }
  }

  throw lastError;
}
