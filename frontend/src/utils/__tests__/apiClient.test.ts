import { describe, it, expect, vi, beforeEach } from 'vitest';

import { apiClient } from '../apiClient';

describe('apiClient helper', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true })) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('serializes JSON body and attaches bearer token', async () => {
    const body = { foo: 'bar' };
    const token = 'XYZ123';

    await apiClient('/test-endpoint', { method: 'POST', body, token });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, init] = (global.fetch as unknown as vi.Mock).mock.calls[0] as [string, RequestInit];

    expect(url.endsWith('/test-endpoint')).toBe(true);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    expect(init?.body).toBe(JSON.stringify(body));
  });
});
