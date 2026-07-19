import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-base/60">
      <p className="font-mono text-lg text-secondary">404</p>
      <p className="text-2xs text-secondary">This route does not exist.</p>
      <Link to="/" className="rounded border border-accent-dim px-3 py-1.5 text-2xs text-accent hover:bg-accent-dim/50">
        Back to search
      </Link>
    </div>
  );
}
