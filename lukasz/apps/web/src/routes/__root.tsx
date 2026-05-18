import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { MuteToggle } from '@/components/ui/mute-toggle';
import { HistoryToggle } from '@/features/history/history-toggle';
import { CancelMidFlowOverlay } from '@/features/query/cancel-midflow-overlay';
import { QueryBar } from '@/features/query/query-bar';
import { SoundOrchestrator } from '@/sound/sound-orchestrator';
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
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <HistoryToggle />
            <div className="flex-1">
              <QueryBar />
            </div>
            <MuteToggle />
          </div>
        </header>
        <Outlet />
        <SoundOrchestrator />
        <CancelMidFlowOverlay />
      </div>
    </FlowStoreProvider>
  );
}
