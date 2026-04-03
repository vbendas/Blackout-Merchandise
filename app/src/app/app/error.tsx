'use client';

import { useEffect } from 'react';

export default function ErrorComponent({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h2 className="text-2xl font-bold text-rose-500">Something went wrong!</h2>
        <p className="text-muted-foreground">We encountered an unexpected error. Please try again.</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
