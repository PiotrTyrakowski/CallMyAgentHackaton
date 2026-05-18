import {
  confirmationCode as toConfirmationCode,
  offerId as toOfferId,
} from '@callmyagent/lib/ids';
import type { Offer } from '@callmyagent/lib/types';
import {
  cleanup,
  render as rtlRender,
  screen,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FlowStoreProvider,
  useFlow,
} from '@/stores/flow/flow-store-provider';
import { BookingPane } from './booking-pane';

/**
 * BookingPane calls `useNavigate()` for the "Start a new search" button.
 * Spinning up a full TanStack Router context for a UI smoke test would
 * drown the signal — we mock the hook to a no-op stub so the component
 * mounts and the rest of the assertions can run.
 */
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

/**
 * Inlined provider stack — mirrors the pattern in `pvp-arena.test.tsx`
 * (see the note there about the Fast-Refresh module-identity quirk with
 * the shared `@/test/render` helper). Skipping that helper keeps every
 * FlowStoreProvider/useFlow reference in a single module graph.
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
    amenities: ['wifi', 'kitchen', 'parking'],
    starRating: 4,
    guestRating: 8.7,
    reviewCount: 142,
    cancellation: 'free',
    nearby: [],
    hostName: 'Alex',
  };
}

/**
 * Primes the flow store with an offer + walks the FSM to either `booking`
 * or `booked`. We go through enterPvP → pickPvP (the only public path
 * into `booking`) so the test exercises real reducers rather than poking
 * private state. For `booked` we additionally call `confirmBooked`.
 */
function PrimeBooking({
  winnerId,
  offers,
  bookedCode,
}: {
  winnerId: string;
  offers: Offer[];
  bookedCode?: string;
}) {
  const setOffer = useFlow((s) => s.setOffer);
  const confirmBooked = useFlow((s) => s.confirmBooked);
  const enterPvP = useFlow((s) => s.enterPvP);
  const pickPvP = useFlow((s) => s.pickPvP);
  const phaseName = useFlow((s) => s.phase.name);

  useEffect(() => {
    const target = toOfferId(winnerId);
    for (const offer of offers) setOffer(offer.id, offer);
    enterPvP(target, toOfferId('OTHER'));
    pickPvP(target);
    if (bookedCode) {
      confirmBooked(target, toConfirmationCode(bookedCode));
    }
    // Mount-only effect — re-runs would loop the FSM transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phaseName !== 'booking' && phaseName !== 'booked') return null;
  return <BookingPane />;
}

describe('<BookingPane />', () => {
  // RTL's auto-cleanup hook attaches when `afterEach` is in the global scope;
  // vitest.config.ts sets `globals: false`, so we wire it up explicitly to
  // unmount + clear the DOM between tests. Without this, the first test's
  // rendered tree leaks into the second test's `screen` queries.
  afterEach(() => {
    cleanup();
  });

  it('shows the Easy Book button while phase is `booking`', () => {
    const offers = [makeOffer('W1', 'Marina Penthouse')];
    renderWithProviders(<PrimeBooking winnerId="W1" offers={offers} />);

    // Title doubles as the smoke test that the offer rendered at all.
    expect(screen.getByText('Marina Penthouse')).toBeInTheDocument();
    const easyBook = screen.getByRole('button', { name: /easy book/i });
    expect(easyBook).toBeInTheDocument();
    expect(easyBook).toHaveAttribute('data-action', 'easy-book');
    expect(
      screen.getByRole('button', { name: /back to results/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/booked!/i)).not.toBeInTheDocument();
  });

  it('hides Easy Book and shows the confirmation badge in `booked`', () => {
    const offers = [makeOffer('W2', 'Mission Loft')];
    renderWithProviders(
      <PrimeBooking
        winnerId="W2"
        offers={offers}
        bookedCode="CMA-ABC123"
      />,
    );

    // No CTA after confirmation; we replace it with the success state.
    expect(
      screen.queryByRole('button', { name: /easy book/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /back to results/i }),
    ).not.toBeInTheDocument();

    expect(screen.getByText(/booked!/i)).toBeInTheDocument();
    expect(screen.getByText('CMA-ABC123')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start a new search/i }),
    ).toBeInTheDocument();
  });
});
