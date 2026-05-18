import { describe, expect, it } from 'vitest';
import { offerId } from '@callmyagent/lib/ids';
import type { Offer } from '@callmyagent/lib/types';
import { render, screen } from '@/test/render';
import { CardFront } from './card-front';

function makeOffer(): Offer {
  return {
    id: offerId('SF01'),
    source: 'mock',
    name: 'Sunny Mission Studio',
    type: 'apartment',
    url: 'https://example.test/sf01',
    description: 'A cozy studio in the Mission.',
    address: {
      street: '1 Mission St',
      city: 'San Francisco',
      region: 'CA',
      country: 'US',
      postalCode: '94103',
    },
    coords: { lat: 37.7599, lng: -122.4148 },
    images: ['https://picsum.photos/seed/SF01/600/400'],
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

describe('<CardFront />', () => {
  it('renders offer name and per-night price', () => {
    const offer = makeOffer();
    const { container } = render(<CardFront offer={offer} />);

    expect(screen.getByText(offer.name)).toBeInTheDocument();
    // The price chip lives in the hero corner; its <span> textContent is the
    // canonical assertion (the inline /night label is a child span).
    const priceChip = container.querySelector('.tabular-nums');
    expect(priceChip?.textContent).toContain('USD 220');
    expect(priceChip?.textContent).toContain('/night');
  });

  it('shows the green negotiated badge with savings', () => {
    const offer = makeOffer();
    const { container } = render(
      <CardFront offer={offer} outcome="negotiated" savings={40} />,
    );

    const badge = container.querySelector('[data-outcome="negotiated"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('-$40');
    // Sanity check the green tier color class is applied.
    expect(badge?.className).toMatch(/bg-tier-green/);
  });

  it('shows the neutral answered badge with no savings', () => {
    const offer = makeOffer();
    const { container } = render(
      <CardFront offer={offer} outcome="answered" />,
    );

    const badge = container.querySelector('[data-outcome="answered"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('answered');
  });

  it('shows the red no_answer badge', () => {
    const offer = makeOffer();
    const { container } = render(
      <CardFront offer={offer} outcome="no_answer" />,
    );

    const badge = container.querySelector('[data-outcome="no_answer"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('no answer');
    expect(badge?.className).toMatch(/bg-tier-red/);
  });
});
