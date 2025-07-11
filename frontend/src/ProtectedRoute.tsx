import { Navigate } from 'react-router';

interface ProtectedRouteProps {
  children: JSX.Element;
}

/**
* Guards a route by ensuring the user is authenticated.
*
* Authentication is determined by the presence of a `token` in `localStorage`,
* which is the same mechanism already used elsewhere in the app.
*
* If the token is missing, the user is redirected to the start screen so they
* can log-in or register first.
*/
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
