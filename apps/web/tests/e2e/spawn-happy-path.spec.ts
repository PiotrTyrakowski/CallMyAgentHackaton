import { expect, test } from '@playwright/test';

test('spawn phase renders at least one offer card for /q?text=test', async ({
  page,
}) => {
  await page.goto('/q?text=test');

  // MSW resolves /api/search in ~250–700 ms, then the orchestrator drips ids
  // in at ~30–50 ms each. The first card should be on-screen well inside 5 s.
  const firstCard = page.locator('[data-card-id]').first();
  await expect(firstCard).toBeVisible({ timeout: 5_000 });
});
