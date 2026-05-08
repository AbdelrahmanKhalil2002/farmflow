/**
 * Maps every animal ID used across FarmFlow to its photorealistic PNG.
 * Drop the image in: frontend/public/animals/<id>.png
 * Falls back to Twemoji SVG if the local image hasn't been added yet.
 */

const ANIMAL_IMGS = {
  // ── Livestock ──────────────────────────────────────────────────────────────
  cattle:          '/animals/cattle.png',
  buffalo:         '/animals/buffalo.png',
  sheep:           '/animals/sheep.png',
  goat:            '/animals/goat.png',
  camel:           '/animals/camel.png',
  rabbit:          '/animals/rabbit.png',

  // ── Horses / equines ───────────────────────────────────────────────────────
  horse:           '/animals/horse.png',
  donkey:          '/animals/donkey.png',
  mule:            '/animals/mule.png',

  // ── Poultry (two naming conventions both supported) ────────────────────────
  chicken_baladi:  '/animals/chicken_baladi.png',
  chicken_broiler: '/animals/chicken_broiler.png',
  chicken_layers:  '/animals/chicken_layers.png',
  baladi:          '/animals/chicken_baladi.png',   // SellerAddListing short id
  broiler:         '/animals/chicken_broiler.png',
  layers:          '/animals/chicken_layers.png',
  duck:            '/animals/duck.png',
  turkey:          '/animals/turkey.png',
  pigeon:          '/animals/pigeon.png',
  quail:           '/animals/quail.png',
  goose:           '/animals/goose.png',
  guinea:          '/animals/guinea.png',
  peacock:         '/animals/peacock.png',

  // ── Exotic / rare ──────────────────────────────────────────────────────────
  ostrich:         '/animals/ostrich.png',
  gazelle:         '/animals/gazelle.png',
  oryx:            '/animals/oryx.png',
  deer:            '/animals/deer.png',
  llama:           '/animals/llama.png',
  alpaca:          '/animals/alpaca.png',

  // ── Generics ───────────────────────────────────────────────────────────────
  poultry:         '/animals/chicken_baladi.png',
  other:           '/animals/other.png',
};

/** Twemoji fallback — converts an emoji char to a CDN SVG URL. */
const _twimg = (emoji) => {
  if (!emoji) return null;
  const pts = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(p => p !== 'fe0f')
    .join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${pts}.svg`;
};

/**
 * Returns the best image URL for an animal.
 * @param {string} id    - animal ID (e.g. 'cattle', 'broiler')
 * @param {string} emoji - emoji fallback (e.g. '🐄')
 */
export const animalImg = (id, emoji) => ANIMAL_IMGS[id] ?? _twimg(emoji) ?? null;

/**
 * onError handler: if the local PNG 404s, swap to Twemoji.
 * Usage: <img ... onError={imgFallback(emoji)} />
 */
export const imgFallback = (emoji) => (e) => {
  const fallback = _twimg(emoji);
  if (fallback) e.currentTarget.src = fallback;
};

export default animalImg;
