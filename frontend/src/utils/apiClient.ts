import { getApiUrl } from '../env_utils';

/**
* Thin wrapper around `fetch` that automatically prefixes the backend base
* URL and injects the Firebase *Bearer* token when provided.
*
* The helper intentionally keeps the surface area minimal so that existing
* call-sites can migrate with a one-liner replacement:
*
* ```ts
* // Before
* const token = await currentUser?.getIdToken();
* await fetch(`${getApiUrl()}/player-guesses/start`, { …headers, body });
*
* // After
* await apiClientWithUser('/player-guesses/start', { method: 'POST', body }, currentUser);
* ```
*/

export interface ApiClientOptions {
  /** HTTP method – defaults to `GET`. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /**
   * Request body object that will be serialized with `JSON.stringify`. Omit or
   * pass `undefined` for requests without a body.
   */
  body?: unknown;
  /** Raw Firebase ID token. When omitted the request is sent unauthenticated. */
  token?: string | null;
  /** Additional headers to merge into the default set. */
  headers?: Record<string, string>;
}

/** Performs a REST call against the backend API. */
export async function apiClient(
  endpoint: string,
  {
    method = 'GET',
    body,
    token,
    headers = {},
  }: ApiClientOptions = {},
): Promise<Response> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  // We purposely avoid double-slashes when consumers inadvertently prefix the
  // endpoint with `/`.
  const url = `${getApiUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  return fetch(url, init);
}

/** Convenience wrapper that obtains the Firebase ID token from the provided
*  user and delegates to `apiClient()`.
*/
export async function apiClientWithUser(
  endpoint: string,
  options: Omit<ApiClientOptions, 'token'> = {},
  currentUser?: { getIdToken(): Promise<string> } | null,
): Promise<Response> {
  const token = currentUser ? await currentUser.getIdToken() : undefined;
  return apiClient(endpoint, { ...options, token });
}
