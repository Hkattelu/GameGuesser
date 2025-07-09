import { useState } from 'react';

const apiUrl = 'http://localhost:8080';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/auth/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }

      const { token } = data;
      // Persist token in localStorage so page reloads stay logged in.
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      onAuth(token, username);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border-gray-200 mt-12">
      <h2 className="text-3xl font-bold text-center mb-6">{mode === 'login' ? 'Login' : 'Register'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        {mode === 'login' ? (
          <>Don't have an account?{' '}
            <button className="text-blue-600 hover:underline" onClick={() => setMode('register')}>
              Register here
            </button>
          </>
        ) : (
          <>Already have an account?{' '}
            <button className="text-blue-600 hover:underline" onClick={() => setMode('login')}>
              Login here
            </button>
          </>
        )}
      </p>
    </div>
  );
}
