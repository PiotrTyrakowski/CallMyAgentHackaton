import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IdleView,
});

function IdleView() {
  return (
    <main className="grid place-items-center flex-1 p-12">
      <div className="text-center space-y-4 max-w-xl">
        <h1 className="font-display text-6xl tracking-tight">CallMyAgent</h1>
        <p className="text-text-mute text-lg">
          Tell us where you want to stay. We&rsquo;ll call around, negotiate, and
          bring you the best two.
        </p>
        <Link
          to="/q"
          search={{ text: 'cozy apartment in SF for 2' }}
          className="inline-block rounded-full bg-text px-5 py-2 text-sm font-medium text-card-bg transition-opacity hover:opacity-90"
        >
          Try a sample query
        </Link>
      </div>
    </main>
  );
}
