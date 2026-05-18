/**
 * Post-dissolve placeholder slot (spec §13, D4). Sibling of
 * `<PlaceholderSlot>` but visually quieter: no pulse, no glyph — just a
 * faded outline holding the grid cell open so survivors stay in their
 * original positions during the royale → PvP transition.
 *
 * Same outer dimensions as a card so the masonry never reflows.
 */
export function EmptySlot() {
  return (
    <div
      aria-hidden="true"
      data-slot="empty"
      className="gpu rounded-2xl border border-dashed border-card-border/40 bg-card-bg/20 aspect-[3/4]"
    />
  );
}
