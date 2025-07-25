import { useState } from 'react';
import { getApiUrl } from './env_utils';
import SettingsButton from './components/SettingsButton';

export interface AuthPageProps {
  onAuth: (payload: { token: string; username: string }) => void;
}

function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Detect if the user landed here because their previous session expired.
  const [sessionExpired, setSessionExpired] = useState(
    typeof localStorage !== 'undefined' && localStorage.getItem('sessionExpired') === 'true',
  );

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${getApiUrl()}/auth/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data: { token?: string; error?: string } = await response.json();
      if (!response.ok || !data.token) {
        throw new Error(data.error || 'Unknown error');
      }

      const { token } = data;
      // Persist credentials locally so refresh keeps the user logged-in.
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);

      // Clear any session-expired flag now that the user has successfully
      // authenticated again.
      localStorage.removeItem('sessionExpired');
      setSessionExpired(false);

      onAuth({ token, username });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <SettingsButton />
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-8 rounded-xl shadow-lg border-gray-200 dark:border-gray-700 mt-12">
      <h2 className="text-3xl font-bold text-center mb-6">
        {mode === 'login' ? 'Login' : 'Register'}
      </h2>

      <form onSubmit={handleSubmit}>
        {sessionExpired && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert" data-testid="session-expired-banner">
            Your session has expired. Please log in again.
          </div>
        )}
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

        <button
          type="submit"
          className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button className="cursor-pointer text-blue-600 hover:underline" onClick={() => setMode('register')}>
              Register here
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button className="cursor-pointer text-blue-600 hover:underline" onClick={() => setMode('login')}>
              Login here
            </button>
          </>
        )}
      </p>
      </div>
    </>
  );
}

export default AuthPage;
