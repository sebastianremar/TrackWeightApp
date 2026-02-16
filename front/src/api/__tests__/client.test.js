import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../client.js';

function mockResponse(status, body = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  };
}

/**
 * Helper that starts the api() call, prevents unhandled rejection warnings,
 * and returns a function to await the final result/error after timers advance.
 */
function startApi(url, options) {
  const promise = api(url, options);
  // Prevent Node "PromiseRejectionHandledWarning" by eagerly attaching
  // a no-op catch. We still test the original promise via the returned fn.
  promise.catch(() => {});
  return promise;
}

beforeEach(() => {
  vi.useFakeTimers();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('api client', () => {
  test('includes credentials in requests', async () => {
    global.fetch.mockResolvedValueOnce(mockResponse(200, { ok: true }));

    await api('/api/test');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  test('sets Content-Type header to application/json', async () => {
    global.fetch.mockResolvedValueOnce(mockResponse(200, { ok: true }));

    await api('/api/test');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  test('returns parsed JSON on success', async () => {
    const body = { id: 1, name: 'Sara' };
    global.fetch.mockResolvedValueOnce(mockResponse(200, body));

    const result = await api('/api/test');

    expect(result).toEqual(body);
  });

  test('throws "Session expired" on 401', async () => {
    global.fetch.mockResolvedValueOnce(mockResponse(401, { error: 'Unauthorized' }));

    await expect(api('/api/test')).rejects.toThrow('Session expired');
  });

  test('does NOT retry on 401', async () => {
    global.fetch.mockResolvedValueOnce(mockResponse(401, { error: 'Unauthorized' }));

    await expect(api('/api/test')).rejects.toThrow('Session expired');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('retries on 500 and succeeds', async () => {
    global.fetch
      .mockResolvedValueOnce(mockResponse(500, { error: 'Internal Server Error' }))
      .mockResolvedValueOnce(mockResponse(500, { error: 'Internal Server Error' }))
      .mockResolvedValueOnce(mockResponse(200, { success: true }));

    const promise = startApi('/api/test');

    // First attempt gets 500, waits RETRY_DELAYS[0] = 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Second attempt gets 500, waits RETRY_DELAYS[1] = 2000ms
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('retries on 429 and succeeds', async () => {
    global.fetch
      .mockResolvedValueOnce(mockResponse(429, { error: 'Too Many Requests' }))
      .mockResolvedValueOnce(mockResponse(200, { success: true }));

    const promise = startApi('/api/test');

    // First attempt gets 429, waits RETRY_DELAYS[0] = 1000ms
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('stops retrying after MAX_RETRIES and throws', async () => {
    global.fetch
      .mockResolvedValueOnce(mockResponse(500, { error: 'Internal Server Error' }))
      .mockResolvedValueOnce(mockResponse(500, { error: 'Internal Server Error' }))
      .mockResolvedValueOnce(mockResponse(500, { error: 'Internal Server Error' }));

    const promise = startApi('/api/test');

    // Advance through both retry delays
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow('Internal Server Error');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('throws error message from response body on non-ok status', async () => {
    // A 400 is not retryable by isRetryable(), so it reaches res.json() and throws.
    // However, the catch block retries on all non-"Session expired" errors,
    // so we need to provide responses for all 3 attempts and advance timers.
    global.fetch
      .mockResolvedValueOnce(mockResponse(400, { error: 'Bad request' }))
      .mockResolvedValueOnce(mockResponse(400, { error: 'Bad request' }))
      .mockResolvedValueOnce(mockResponse(400, { error: 'Bad request' }));

    const promise = startApi('/api/test');

    // First attempt throws in catch, waits RETRY_DELAYS[0] = 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Second attempt throws in catch, waits RETRY_DELAYS[1] = 2000ms
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow('Bad request');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('handles AbortError as timeout', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    global.fetch
      .mockRejectedValueOnce(abortError)
      .mockRejectedValueOnce(abortError)
      .mockRejectedValueOnce(abortError);

    const promise = startApi('/api/test');

    // Advance through retry delays
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow('Request timed out');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
