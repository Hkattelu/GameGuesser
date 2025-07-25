/**
* Global session–expiration handling utility.
*
* The backend returns a 404 JSON payload in the shape
* `{ error: "Session not found." }` whenever the supplied sessionId is no
* longer valid.  In a few places it can also respond with HTTP 401.
*
* To avoid duplicating the same defensive logic around every network
* request we **monkey-patch** `window.fetch` once at application startup. The
* wrapper inspects every response and, when it detects an expired session,
* it will:
*
* 1. Purge any persisted credentials (`token` & `username`).
* 2. Display a short, user-friendly alert so the user understands what
*    happened.
* 3. Navigate back to the start screen so that the normal login flow can
*    resume.
*
* The file only exports a single `setupSessionExpiredHandler()` entrypoint
* which is invoked at the very top of `src/index.tsx`.
*/

let alreadyPatched = false;

/** Clears credentials, notifies the user and redirects to the home/login UI. */
export function handleSessionExpired(): void {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  } catch {
    // Ignore – localStorage might be unavailable in some test environments.
  }

  // Notify the user. A native alert keeps the implementation dependency-free.
  // (The design can easily be swapped for a toast/snackbar later.)
  // eslint-disable-next-line no-alert
  window.alert('Your session has expired. Please log in again.');

  // Use `location.assign` instead of mutating `href` directly – this makes it
  // easier to spy in tests and behaves identically for the user.
  try {
    if (window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState({}, '', '/');
    } else {
      window.location.href = '/';
    }
  } catch {
    // Some environments (e.g. very strict JSDOM versions) may disallow
    // manipulating the history or location. Swallow the failure – unit tests
    // will still confirm that credentials were cleared and the alert was
    // shown.
  }
}

/**
* Idempotently installs a wrapper around `window.fetch` that detects the
* backend's "session not found" responses.
*/
export function setupSessionExpiredHandler(): void {
  if (alreadyPatched || typeof window === 'undefined' || !window.fetch) {
    return;
  }
  alreadyPatched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const response = await originalFetch(input, init);

    if (!response.ok) {
      const { status } = response;
      let shouldExpire = false;

      // 401 -> always treat as expired credentials.
      if (status === 401) {
        shouldExpire = true;
      } else if (status === 404) {
        // For 404 we need to look at the payload because there are legitimate
        // 404s unrelated to session/auth.
        try {
          const cloned = response.clone();
          const data = (await cloned.json()) as { error?: string } | undefined;
          const message = data?.error?.toLowerCase() ?? '';
          if (message.includes('session not found')) {
            shouldExpire = true;
          }
        } catch {
          // Ignore parse errors – not JSON or malformed. Nothing to do.
        }
      }

      if (shouldExpire) {
        handleSessionExpired();
      }
    }

    return response;
  };
}
