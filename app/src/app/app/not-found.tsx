import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h2 className="text-4xl font-bold text-rose-500">404</h2>
        <p className="text-xl text-muted-foreground">Page not found</p>
        <p className="text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          href="/app/workspace"
          className="inline-block px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
