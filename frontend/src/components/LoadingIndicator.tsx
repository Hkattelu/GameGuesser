import MascotImage from './MascotImage';

interface LoadingIndicatorProps {
  message?: string;
}

function LoadingIndicator({ message = "Loading..." }: LoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-xl">
      <p className="mt-4 text-gray-600 dark:text-gray-300 animate-pulse">{message}</p>
    </div>
  );
}

export default LoadingIndicator;