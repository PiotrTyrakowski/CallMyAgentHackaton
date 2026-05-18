import { offerId as toOfferId } from '@callmyagent/lib/ids';
import type { Offer } from '@callmyagent/lib/types';
import {
  render as rtlRender,
  screen,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import {
  FlowStoreProvider,
  useFlow,
} from '@/stores/flow/flow-store-provider';
import { PvPArena } from './pvp-arena';

/**
 * We bypass `@/test/render` here because that helper sits in a sibling
 * Fast-Refresh module — when *its* `FlowStoreProvider` import is the one that
 * gets mounted, vite-plugin-react treats it as a distinct module from the
 * `FlowStoreProvider` re-imported by this test, and `useFlow` then can't see
 * the provider. Inlining the provider stack keeps everything in one module
 * graph and side-steps the issue. The set of providers below mirrors the
 * shape of `@/test/render` so the test still exercises the production
 * wrapping (QueryClient + MotionConfig + FlowStore).
 */
function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = makeTestQueryClient();
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="always">
        <FlowStoreProvider init={{}}>{ui}</FlowStoreProvider>
      </MotionConfig>
    </QueryClientProvider>,
  );
}

function makeOffer(id: string, name: string): Offer {
  return {
    id: toOfferId(id),
    source: 'mock',
    name,
    type: 'apartment',
    url: `https://example.test/${id}`,
    description: `${name} — a place to stay.`,
    address: {
      street: '1 Test St',
      city: 'San Francisco',
      region: 'CA',
      country: 'US',
      postalCode: '94103',
    },
    coords: { lat: 37.7599, lng: -122.4148 },
    images: [`https://picsum.photos/seed/${id}/600/400`],
    pricePerNight: 220,
    totalPrice: 440,
    currency: 'USD',
    checkIn: '2026-05-16',
    checkOut: '2026-05-18',
    nights: 2,
    occupancy: { maxGuests: 2, beds: 1, bedrooms: 1 },
    amenities: ['wifi', 'kitchen'],
    starRating: 4,
    guestRating: 8.7,
    reviewCount: 142,
    cancellation: 'free',
    nearby: [],
  };
}

/**
 * Primes the flow store into `pvp` with two seeded offers, then renders the
 * arena. Using a one-shot mount-time effect avoids leaking test plumbing into
 * the production component's API (no "initial phase" prop on PvPArena).
 */
function PrimePvP({
  goldA,
  goldB,
  offers,
}: {
  goldA: string;
  goldB: string;
  offers: Offer[];
}) {
  const setOffer = useFlow((s) => s.setOffer);
  const enterPvP = useFlow((s) => s.enterPvP);
  const phaseName = useFlow((s) => s.phase.name);

  useEffect(() => {
    for (const offer of offers) setOffer(offer.id, offer);
    enterPvP(toOfferId(goldA), toOfferId(goldB));
    // Mount-only effect — re-running on identity changes of the callbacks
    // would re-enter PvP after pickPvP fires (and break user-event tests).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phaseName !== 'pvp') return null;
  return <PvPArena />;
}

describe('<PvPArena />', () => {
  it('renders exactly TWO arena cards — never one, never three', () => {
    const offers = [
      makeOffer('G1', 'Marina Penthouse'),
      makeOffer('G2', 'Mission Loft'),
    ];
    renderWithProviders(
      <PrimePvP goldA="G1" goldB="G2" offers={offers} />,
    );

    // Each ArenaCard is a <motion.button> — querying by role 'button' is the
    // load-bearing assertion. If anyone adds a third card (e.g. revives the
    // "top 6 best" pattern) or wraps the arena in a deck-stack carousel, this
    // count drifts and the test fails loudly. That's the entire point —
    // bait/switch against the old PvP design (spec §10 "EXACTLY 2 CARDS").
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);

    // And both cards must surface their offers' names, otherwise we have two
    // cards but one is a stray UI element (back-button, swipe handle, etc.).
    expect(screen.getByText('Marina Penthouse')).toBeInTheDocument();
    expect(screen.getByText('Mission Loft')).toBeInTheDocument();
  });

  it('returns null when the store is not in the pvp phase', () => {
    const { container } = renderWithProviders(<PvPArena />);
    expect(container).toBeEmptyDOMElement();
  });
});
