import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { LayoutGroup, MotionConfig } from 'motion/react';
import { Toaster } from 'sonner';
import { springs } from '@/motion/springs';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return false;
        return failureCount < 2;
      },
      retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: { retry: 0 },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user" transition={springs.snap}>
        {/*
         * LayoutGroup at app root is mandatory for the phase-morph FLIP
         * (spec §13): cards share `layoutId="card-${offerId}"` across
         * MasonryCanvas → PvPArena → BookingPane and `LayoutGroup` keeps
         * Motion's id registry coherent when those phase-level components
         * mount/unmount.
         */}
        <LayoutGroup>
          <RouterProvider router={router} />
        </LayoutGroup>
        <Toaster richColors position="top-center" />
        <ReactQueryDevtools initialIsOpen={false} />
      </MotionConfig>
    </QueryClientProvider>
  );
}
