export type ICoffeeShopItem = {
  id: number;
  name: string;
  title?: string | null;
  description?: string | null;
  type?: number | null;
  background?: string | null;
  files?: string | null;
  createdAt?: string | Date | null;
};
