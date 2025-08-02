interface LoadingIndicatorProps {
  message?: string;
  gif?: boolean;
}

function LoadingIndicator({ message = "Loading...", gif = false }: LoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-xl">
      {gif && <img className="h-60 w-60" src="/bot_boy/running.gif" alt="message" />}
      <p className="mt-4 text-gray-600 dark:text-gray-300 animate-pulse">{message}</p>
    </div>
  );
}

export default LoadingIndicator;