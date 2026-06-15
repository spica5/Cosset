export const COFFEE_SHOP_MOBILE_PANEL_EVENT = 'coffee-shop-mobile-panel-open';

export type CoffeeShopMobilePanel = 'menu' | 'chat' | null;

export const COFFEE_SHOP_MOBILE_DOCK = {
  left: 12,
  top: 10,
  bottom: 12,
  fabSize: 65,
  gap: 8,
  formGap: 8,
  rightInset: 10,
} as const;

export const getCoffeeShopMobileDockSideWidth = () =>
  COFFEE_SHOP_MOBILE_DOCK.fabSize + COFFEE_SHOP_MOBILE_DOCK.formGap;

export const getCoffeeShopMobileMenuFormLeft = () =>
  COFFEE_SHOP_MOBILE_DOCK.left + getCoffeeShopMobileDockSideWidth();

export const getCoffeeShopMobileChatFormRight = () =>
  COFFEE_SHOP_MOBILE_DOCK.rightInset + getCoffeeShopMobileDockSideWidth();

export const getCoffeeShopMobileMenuFormWidth = () =>
  `calc(100vw - ${getCoffeeShopMobileMenuFormLeft() + COFFEE_SHOP_MOBILE_DOCK.rightInset}px)`;

export const getCoffeeShopMobileLeftDockReservedWidth = () =>
  COFFEE_SHOP_MOBILE_DOCK.left + getCoffeeShopMobileDockSideWidth();

export const getCoffeeShopMobileChatFormWidth = () =>
  `calc(100vw - ${getCoffeeShopMobileLeftDockReservedWidth() + getCoffeeShopMobileChatFormRight()}px)`;

export const getCoffeeShopLeftDockStep = () =>
  COFFEE_SHOP_MOBILE_DOCK.fabSize + COFFEE_SHOP_MOBILE_DOCK.gap;

export const getCoffeeShopParticipantsDockBottom = (stackAboveBackground: boolean) =>
  stackAboveBackground
    ? COFFEE_SHOP_MOBILE_DOCK.bottom + getCoffeeShopLeftDockStep()
    : COFFEE_SHOP_MOBILE_DOCK.bottom;

export const coffeeShopLeftDockPanelSx = {
  py: 1,
  px: 1,
  borderRadius: 2,
  bgcolor: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(8px)',
  maxHeight: 'min(50dvh, 360px)',
  overflowY: 'auto' as const,
} as const;

export const coffeeShopMobileFabSx = {
  width: COFFEE_SHOP_MOBILE_DOCK.fabSize,
  height: COFFEE_SHOP_MOBILE_DOCK.fabSize,
  bgcolor: 'rgba(15, 20, 28, 0.88)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'common.white',
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
} as const;

export const coffeeShopMobileMenuFormBoxSx = {
  position: 'fixed' as const,
  left: getCoffeeShopMobileMenuFormLeft(),
  top: COFFEE_SHOP_MOBILE_DOCK.top,
  width: getCoffeeShopMobileMenuFormWidth(),
  maxWidth: getCoffeeShopMobileMenuFormWidth(),
  maxHeight: `calc(100dvh - ${COFFEE_SHOP_MOBILE_DOCK.top * 2}px)`,
  pointerEvents: 'auto' as const,
};

export const coffeeShopMobileChatFormBoxSx = {
  position: 'fixed' as const,
  left: getCoffeeShopMobileLeftDockReservedWidth(),
  right: getCoffeeShopMobileChatFormRight(),
  bottom: COFFEE_SHOP_MOBILE_DOCK.bottom,
  width: getCoffeeShopMobileChatFormWidth(),
  maxWidth: getCoffeeShopMobileChatFormWidth(),
  maxHeight: 'calc(100dvh - 24px)',
  pointerEvents: 'auto' as const,
};

let activePanel: CoffeeShopMobilePanel = null;
const listeners = new Set<(panel: CoffeeShopMobilePanel) => void>();

function notify(panel: CoffeeShopMobilePanel) {
  listeners.forEach((listener) => listener(panel));
  window.dispatchEvent(new CustomEvent(COFFEE_SHOP_MOBILE_PANEL_EVENT, { detail: panel }));
}

export function subscribeCoffeeShopMobilePanel(listener: (panel: CoffeeShopMobilePanel) => void) {
  listeners.add(listener);
  listener(activePanel);

  return () => {
    listeners.delete(listener);
  };
}

export function openCoffeeShopMobilePanel(panel: 'menu' | 'chat') {
  activePanel = panel;
  notify(panel);
}

export function closeCoffeeShopMobilePanel() {
  activePanel = null;
  notify(null);
}

export function toggleCoffeeShopMobilePanel(panel: 'menu' | 'chat') {
  if (activePanel === panel) {
    closeCoffeeShopMobilePanel();
    return;
  }

  openCoffeeShopMobilePanel(panel);
}
