import { Howl } from 'howler';

/**
 * Howler audio atlas (spec §15). Each entry preloads paired `.webm` and `.mp3`
 * fallback variants. The real files don't ship in v1 — Howler degrades to a
 * silent no-op when an asset fails to load, so calling `.play()` is safe even
 * with empty `public/sounds/`. Volumes are baked into the atlas so callers
 * don't tune per-site.
 */
export const sounds = {
  ring: new Howl({
    src: ['/sounds/ring.webm', '/sounds/ring.mp3'],
    volume: 0.3,
    loop: true,
    preload: true,
  }),
  fallToHell: new Howl({
    src: ['/sounds/fall.webm', '/sounds/fall.mp3'],
    volume: 0.5,
    preload: true,
  }),
  greenChime: new Howl({
    src: ['/sounds/green.webm', '/sounds/green.mp3'],
    volume: 0.6,
    preload: true,
  }),
  goldFanfare: new Howl({
    src: ['/sounds/gold.webm', '/sounds/gold.mp3'],
    volume: 0.7,
    preload: true,
  }),
  swipeLeft: new Howl({
    src: ['/sounds/swipe-left.webm', '/sounds/swipe-left.mp3'],
    volume: 0.5,
    preload: true,
  }),
  swipeRight: new Howl({
    src: ['/sounds/swipe-right.webm', '/sounds/swipe-right.mp3'],
    volume: 0.5,
    preload: true,
  }),
  success: new Howl({
    src: ['/sounds/success.webm', '/sounds/success.mp3'],
    volume: 0.8,
    preload: true,
  }),
} as const;

export type SoundName = keyof typeof sounds;
