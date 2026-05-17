import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { QueryBar } from '@/features/query/query-bar';
import { FlowStoreProvider } from '@/stores/flow/flow-store-provider';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <FlowStoreProvider init={{}}>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-canvas border-b border-card-border bg-canvas-bg/85 px-6 py-3 backdrop-blur">
          <div className="mx-auto max-w-5xl">
            <QueryBar />
          </div>
        </header>
        <Outlet />
      </div>
    </FlowStoreProvider>
  );
}
