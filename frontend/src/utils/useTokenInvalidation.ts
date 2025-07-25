import { useEffect } from 'react';

/**
* React hook that subscribes to the global `token-invalid` event broadcast by
* `setupGlobalUnauthorizedInterceptor()` (see `fetchInterceptor.ts`).
*
* When the event fires the provided `onInvalidated` callback is executed.
*
* Typical usage is to pass existing `handleLogout` or similar clean-up logic
* so that any 401 response cleanly logs the user out.
*/
export function useTokenInvalidation(onInvalidated: () => void) {
  useEffect(() => {
    const listener = () => {
      onInvalidated();
    };

    window.addEventListener('token-invalid', listener);
    return () => window.removeEventListener('token-invalid', listener);
  }, [onInvalidated]);
}
