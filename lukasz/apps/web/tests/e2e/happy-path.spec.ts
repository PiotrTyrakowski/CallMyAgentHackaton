import { expect, test } from '@playwright/test';

/**
 * Full 5-phase happy path: query → spawn → calling → royale → PvP → book.
 *
 * Marked `fixme` because the calling phase fans out 40 SSE streams with
 * jittered per-call delays (`mocks/handlers/call-events.ts` produces an
 * outcome between ~15 s and ~60 s for the slow tail) — wall-clocking the
 * whole thing into a single test exceeds the Playwright default timeout
 * and produces flakes in CI even when the app is healthy. Re-enable once
 * we ship a deterministic-mode handler short-circuit (e.g. a query-param
 * that collapses all per-call timers) — until then, the smoke spec
 * `spawn-happy-path.spec.ts` covers the entry edge.
 */
test.fixme(
  'full happy path lands the user on a confirmation code',
  async ({ page }) => {
    await page.goto('/q?text=cozy%20apartment%20in%20SF');

    // Phase 1: spawn — wait for the full deck of 40 cards.
    await page
      .locator('[data-card-id]')
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 });

    // Phase 4: PvP — exactly two arena cards.
    const arenaCards = page.locator('[data-arena="true"]');
    await expect(arenaCards).toHaveCount(2, { timeout: 90_000 });

    // Pick the first gold card → store flips to booking.
    await arenaCards.first().click();

    // Phase 5: booking pane + Easy Book CTA.
    const easyBook = page.locator('[data-action="easy-book"]');
    await expect(easyBook).toBeVisible({ timeout: 5_000 });
    await easyBook.click();

    // Confirmation: `Booked!` badge + a `CMA-XXXXXX` code.
    await expect(page.getByText(/booked!/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/CMA-/i)).toBeVisible();
  },
);
