'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <div className="mx-auto max-w-md space-y-6 p-6 text-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter text-foreground">
                Something went wrong!
              </h1>
              <p className="text-muted-foreground">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>
            <button
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
