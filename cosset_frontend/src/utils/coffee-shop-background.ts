/**
 * Parse `coffee_shops.background` into image URLs/keys for multi-image backgrounds.
 * - CSS gradients: returns [] (use full `background` string as gradient).
 * - JSON array: `["key1","key2"]`
 * - Single `http(s)` URL or storage key: returns one element.
 */
export function parseCoffeeShopBackgroundImages(bg: string | null | undefined): string[] {
  const s = String(bg || '').trim();
  if (!s) {
    return [];
  }
  if (s.includes('gradient(')) {
    return [];
  }
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return [s];
  }
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [s];
}

export function isCoffeeShopGradientBackground(bg: string | null | undefined): boolean {
  return String(bg || '').trim().includes('gradient(');
}

/** Persist: one key as plain string; multiple as JSON array. */
export function serializeCoffeeShopBackgroundKeys(keys: string[]): string {
  const cleaned = keys.map((k) => k.trim()).filter(Boolean);
  if (!cleaned.length) {
    return '';
  }
  if (cleaned.length === 1) {
    return cleaned[0];
  }
  return JSON.stringify(cleaned);
}
