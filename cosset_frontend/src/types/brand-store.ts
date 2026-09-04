export type IBrandProductStatus = 'available' | 'sold_out' | 'wishlist';

export type IBrandWishlistClientStatus = 'wish' | 'purchased' | 'canceled';

export function normalizeBrandWishlistClientStatus(
  value?: string | null,
): IBrandWishlistClientStatus {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (raw === 'purchased') return 'purchased';
  if (raw === 'canceled' || raw === 'cancelled') return 'canceled';
  return 'wish';
}

export function getBrandWishlistClientStatusLabel(status: IBrandWishlistClientStatus) {
  if (status === 'purchased') return 'Purchased';
  if (status === 'canceled') return 'Canceled';
  return 'Wish';
}

export function getBrandWishlistClientStatusColor(
  status: IBrandWishlistClientStatus,
): 'default' | 'info' | 'success' | 'error' | 'warning' {
  if (status === 'purchased') return 'success';
  if (status === 'canceled') return 'error';
  return 'info';
}

export type IBrandStore = {
  id: number;
  ownerCustomerId: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  coverImage?: string | null;
  logoImage?: string | null;
  introVideo?: string | null;
  isPublic: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  ownerEmail?: string | null;
  ownerPhotoURL?: string | null;
  categoryCount?: number;
  productCount?: number;
  totalViews?: number;
  favoriteCount?: number;
  wishlistCount?: number;
};

export type IBrandCategory = {
  id: number;
  storeId: number;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  sortOrder: number;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  productCount?: number;
};

export type IBrandProduct = {
  id: number;
  storeId: number;
  categoryId: number;
  name: string;
  productCode?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  imageUrl?: string | null;
  images?: string[];
  status?: IBrandProductStatus;
  isAvailable: boolean;
  sortOrder: number;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  categoryName?: string | null;
};

export type IBrandProductOrderStatus = 'purchased' | 'fulfilled' | 'cancelled';

export type IBrandProductOrder = {
  id: number;
  storeId: number;
  productId: number;
  productName: string;
  productImage?: string | null;
  price?: string | null;
  currency?: string | null;
  quantity: number;
  status: IBrandProductOrderStatus;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
  note?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type IBrandProductWishlistItem = {
  id: number;
  brandStoreId: number;
  productId: number;
  userId: string;
  status?: IBrandWishlistClientStatus | null;
  note?: string | null;
  createdAt?: string | Date | null;
  productName: string;
  productCode?: string | null;
  productDescription?: string | null;
  productPrice?: string | null;
  productCurrency?: string | null;
  productImage?: string | null;
  productStatus?: string | null;
  categoryName?: string | null;
  storeName?: string | null;
  storeLogoImage?: string | null;
};

export type IBrandStoreWishlistClientItem = IBrandProductWishlistItem & {
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerEmail?: string | null;
  customerPhotoURL?: string | null;
};

export function getBrandProductImages(product: Pick<IBrandProduct, 'images' | 'imageUrl'>): string[] {
  if (Array.isArray(product.images) && product.images.length) {
    return product.images.map((item) => String(item || '').trim()).filter(Boolean);
  }

  const single = String(product.imageUrl || '').trim();
  if (!single) {
    return [];
  }

  if (single.startsWith('[')) {
    try {
      const parsed = JSON.parse(single);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // Fall through
    }
  }

  return [single];
}

export function normalizeBrandProductStatus(
  product: Pick<IBrandProduct, 'status' | 'isAvailable'> | IBrandProductStatus | null | undefined,
): IBrandProductStatus {
  if (typeof product === 'string') {
    const raw = product.trim().toLowerCase().replace(/-/g, '_');
    if (raw === 'available' || raw === 'sold_out' || raw === 'wishlist') return raw;
    return 'available';
  }

  const raw = String(product?.status || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (raw === 'available' || raw === 'sold_out' || raw === 'wishlist') return raw;
  return product?.isAvailable === false ? 'sold_out' : 'available';
}

export function getBrandProductStatusLabel(status: IBrandProductStatus) {
  if (status === 'sold_out') return 'Sold-out';
  if (status === 'wishlist') return 'Wishlist';
  return 'Available';
}

export function getBrandProductStatusColor(
  status: IBrandProductStatus,
): 'success' | 'warning' | 'info' {
  if (status === 'sold_out') return 'warning';
  if (status === 'wishlist') return 'info';
  return 'success';
}
