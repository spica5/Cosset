import { uuidv4 } from 'src/utils/uuidv4';

// ----------------------------------------------------------------------

export type CoffeeShopMenuItem = {
  id: string;
  name: string;
  imageUrl: string;
  price?: number | null;
  description?: string | null;
};

export function parseCoffeeShopMenuItems(menuJson: string | null | undefined): CoffeeShopMenuItem[] {
  const raw = String(menuJson || '').trim();
  if (!raw.startsWith('[')) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const items: CoffeeShopMenuItem[] = [];

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
      const price =
        typeof priceRaw === 'number' && Number.isFinite(priceRaw)
          ? priceRaw
          : typeof priceRaw === 'string' && priceRaw.trim() !== ''
            ? Number.parseFloat(priceRaw)
            : null;

      items.push({
        id: String(row.id || `menu-${index}`).trim() || uuidv4(),
        name,
        imageUrl,
        price: price != null && !Number.isNaN(price) ? price : null,
        description: row.description != null ? String(row.description).trim() : null,
      });
    });

    return items;
  } catch {
    return [];
  }
}

export function serializeCoffeeShopMenuItems(items: CoffeeShopMenuItem[]): string {
  const cleaned = items
    .map((item) => ({
      id: item.id || uuidv4(),
      name: item.name.trim(),
      imageUrl: item.imageUrl.trim(),
      price: item.price ?? null,
      description: item.description?.trim() || null,
    }))
    .filter((item) => item.name && item.imageUrl);

  if (!cleaned.length) {
    return '';
  }

  return JSON.stringify(cleaned);
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

/** Saved menu items for display on universe / API (only complete name + image). */
export function getCoffeeShopMenuItems(
  menu: string | null | undefined,
  legacyFiles?: string | null | undefined,
): CoffeeShopMenuItem[] {
  return parseCoffeeShopMenuItems(resolveCoffeeShopMenuJson(menu, legacyFiles));
}

export function createDraftMenuItem(imageUrl: string): CoffeeShopMenuItem {
  return {
    id: uuidv4(),
    name: '',
    imageUrl,
    price: null,
    description: null,
  };
}
