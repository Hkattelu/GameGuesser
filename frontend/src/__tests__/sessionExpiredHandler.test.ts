import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setupSessionExpiredHandler } from '../utils/sessionExpiredHandler';

describe('session expired handler', () => {
  const originalFetch = global.fetch;
  const originalAlert = window.alert;
  const originalHref = window.location.href;

  beforeEach(() => {
    // Put fake credentials in storage
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('username', 'player1');

    // Stub alert and location.assign so we can assert on them.
    window.alert = vi.fn();
    // Move the location away from '/' so we can assert it changes.
    window.history.pushState({}, '', '/some-initial-path');

    // Mock fetch to always return a 404 "session not found" response.
    const mockResponse = new Response(
      JSON.stringify({ error: 'Session not found.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

    // Install the handler **after** fetch is stubbed so that it wraps the stub.
    setupSessionExpiredHandler();
  });

  afterEach(() => {
    // Restore globals
    global.fetch = originalFetch;
    window.alert = originalAlert;
    // Restore original location
    window.history.pushState({}, '', originalHref);

    localStorage.clear();
    vi.clearAllMocks();
  });

  it('clears credentials, alerts the user and redirects to home on session expiry', async () => {
    await fetch('/some-protected-endpoint');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('username')).toBeNull();

    expect(window.alert).toHaveBeenCalledWith('Your session has expired. Please log in again.');
    expect(window.location.pathname).toBe('/');
  });
});
