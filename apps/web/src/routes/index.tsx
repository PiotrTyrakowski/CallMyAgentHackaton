import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IdleView,
});

function IdleView() {
  return (
    <main className="grid place-items-center flex-1 p-12">
      <div className="text-center space-y-4 max-w-xl">
        <h1 className="font-display text-6xl tracking-tight">CallMyAgent</h1>
        <p className="text-text-mute text-lg">
          Tell us where you want to stay. We&rsquo;ll call around, negotiate, and bring you the
          best two.
        </p>
        <p className="font-mono text-xs text-text-mute">
          Scaffold alive. Query bar lands in phase 1.
        </p>
      </div>
    </main>
  );
}
