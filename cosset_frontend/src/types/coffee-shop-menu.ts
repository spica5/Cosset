export type { CoffeeShopMenuItem } from 'src/utils/coffee-shop-menu';

export type CoffeeShopMenuOrderBody = {
  menuItemId: string;
  quantity?: number;
};
