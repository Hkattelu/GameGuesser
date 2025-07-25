/**
* Global `fetch` response interceptor that detects expired/invalid session
* tokens (HTTP 401 responses) and broadcasts a `token-invalid` event.
*
* The event allows any part of the UI to react (e.g. log-out the user,
* surface a banner, redirect back to the login page, etc.) without every
* individual API call having to duplicate the same error-handling logic.
*
* The interceptor **does not** mutate request parameters nor retry failed
* calls – it simply passes the original `Response` object through unchanged
* after emitting the notification so existing call-sites continue to work
* exactly as before.
*
* Usage: import and invoke once at application start-up **before** the first
* API request is made (e.g. in `index.tsx`).
*/

/* eslint-disable no-param-reassign */

// Symbol used to guard against installing the interceptor multiple times
const FETCH_PATCHED_FLAG = '__gg_fetch_patched__';

export function setupGlobalUnauthorizedInterceptor() {
  // Skip if already installed (can happen during HMR or Jest re-imports)
  if ((window as any)[FETCH_PATCHED_FLAG]) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const response = await originalFetch(...args);

    if (response.status === 401) {
      try {
        // Preserve the last visited route so we can restore it after re-login.
        localStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search);
        // Signal the reason for redirect on the login page.
        localStorage.setItem('sessionExpired', 'true');
      } catch {
        // Swallow quota/security errors – not fatal for logout flow.
      }
      // Broadcast a cancellable, bubbling event so any interested listener
      // (e.g. in `App` or `StartScreen`) can run clean-up and redirect logic.
      window.dispatchEvent(new CustomEvent('token-invalid', { detail: { response } }));
    }

    return response;
  };

  // Mark as installed so we don't patch twice.
  (window as any)[FETCH_PATCHED_FLAG] = true;
}
