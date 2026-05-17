import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { FlowStoreProvider } from '@/stores/flow/flow-store-provider';
import type { FlowInit } from '@/stores/flow/types';
import type { ReactElement } from 'react';

interface Opts extends Omit<RenderOptions, 'queries'> {
  flowInit?: FlowInit;
  queryClient?: QueryClient;
}

function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

export function render(
  ui: ReactElement,
  { flowInit = {}, queryClient = makeTestQueryClient(), ...options }: Opts = {}
) {
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="always">
        <FlowStoreProvider init={flowInit}>{ui}</FlowStoreProvider>
      </MotionConfig>
    </QueryClientProvider>,
    options
  );
}

export * from '@testing-library/react';
