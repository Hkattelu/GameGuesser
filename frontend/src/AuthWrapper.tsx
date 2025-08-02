import { useAuth } from './AuthContext';
import StartScreen from './StartScreen';
import AuthPage from './AuthPage';
import LoadingIndicator from './components/LoadingIndicator';

const AuthWrapper: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingIndicator gif={true} />;
  }

  if (currentUser) {
    return <StartScreen />;
  }

  return <AuthPage />;
};

export default AuthWrapper;
