"use client";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div>
      <p className="error">Something went wrong loading this page. Please try again.</p>
      {error.digest && <p className="muted">Error ID: {error.digest}</p>}
      <button onClick={retry}>Try again</button>
    </div>
  );
}
