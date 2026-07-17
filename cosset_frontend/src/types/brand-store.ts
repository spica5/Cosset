export type IBrandStore = {
  id: number;
  ownerCustomerId: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  coverImage?: string | null;
  logoImage?: string | null;
  isPublic: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  ownerEmail?: string | null;
  ownerPhotoURL?: string | null;
  categoryCount?: number;
  productCount?: number;
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
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  imageUrl?: string | null;
  images?: string[];
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
