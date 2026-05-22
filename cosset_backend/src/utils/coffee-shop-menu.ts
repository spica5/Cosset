export type CoffeeShopMenuItemPayload = {
  id: string;
  name: string;
  imageUrl: string;
  price: number | null;
  description: string | null;
};

export function parseCoffeeShopMenuItems(menuJson: string | null | undefined): CoffeeShopMenuItemPayload[] {
  const raw = String(menuJson || '').trim();
  if (!raw.startsWith('[')) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const items: CoffeeShopMenuItemPayload[] = [];

    parsed.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const row = entry as Record<string, unknown>;
      const name = String(row.name || '').trim();
      const imageUrl = String(row.imageUrl || row.image || '').trim();
      if (!name || !imageUrl) {
        return;
      }

      const priceRaw = row.price;
      let price: number | null = null;
      if (typeof priceRaw === 'number' && Number.isFinite(priceRaw)) {
        price = priceRaw;
      } else if (typeof priceRaw === 'string' && priceRaw.trim() !== '') {
        const n = Number.parseFloat(priceRaw);
        price = Number.isNaN(n) ? null : n;
      }

      items.push({
        id: String(row.id || `menu-${index}`).trim() || `menu-${index}`,
        name,
        imageUrl,
        price,
        description: row.description != null ? String(row.description).trim() : null,
      });
    });

    return items;
  } catch {
    return [];
  }
}

/** Prefer `menu` column; fall back to legacy menu JSON stored in `files`. */
export function resolveCoffeeShopMenuJson(
  menu: string | null | undefined,
  legacyFiles?: string | null | undefined,
): string | null | undefined {
  const menuRaw = String(menu || '').trim();
  if (menuRaw.startsWith('[')) {
    return menuRaw;
  }
  const filesRaw = String(legacyFiles || '').trim();
  if (filesRaw.startsWith('[')) {
    return filesRaw;
  }
  return null;
}

export function getCoffeeShopMenuItems(
  menu: string | null | undefined,
  legacyFiles?: string | null | undefined,
): CoffeeShopMenuItemPayload[] {
  return parseCoffeeShopMenuItems(resolveCoffeeShopMenuJson(menu, legacyFiles));
}
