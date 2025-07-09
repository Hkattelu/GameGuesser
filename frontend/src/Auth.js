import { useState } from 'react';

const API_URL = 'http://localhost:8080';

function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }

      const data = await response.json();
      const { token, user } = data;
      onAuthSuccess(token, user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded">
      <h2 className="text-2xl font-bold mb-4 capitalize">{mode}</h2>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          className="w-full p-2 border mb-3"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full p-2 border mb-3"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="w-full p-2 bg-blue-600 text-white rounded" type="submit">
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>
      <p className="mt-4 text-sm">
        {mode === 'login' ? (
          <>Don't have an account?{' '}
          <button className="text-blue-600" onClick={() => setMode('register')}>Register</button></>
        ) : (
          <>Already have an account?{' '}
          <button className="text-blue-600" onClick={() => setMode('login')}>Login</button></>
        )}
      </p>
    </div>
  );
}

export default Auth;
