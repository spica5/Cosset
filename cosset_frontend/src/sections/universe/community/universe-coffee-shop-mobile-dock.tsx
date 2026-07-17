'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { Iconify } from 'src/components/universe/iconify';

import {
  COFFEE_SHOP_MOBILE_DOCK,
  coffeeShopMobileFabSx,
  subscribeCoffeeShopMobilePanel,
  toggleCoffeeShopMobilePanel,
  type CoffeeShopMobilePanel,
} from './coffee-shop-mobile-panels';

// ----------------------------------------------------------------------

export function UniverseCoffeeShopMobileDock() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activePanel, setActivePanel] = useState<CoffeeShopMobilePanel>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => subscribeCoffeeShopMobilePanel(setActivePanel), []);

  if (!isMobile || !portalTarget) {
    return null;
  }

  const activeFabSx =
    activePanel === 'chat'
      ? {
          border: '2px solid',
          borderColor: 'primary.main',
        }
      : undefined;

  return createPortal(
    <Box
      sx={{
        position: 'fixed',
        right: COFFEE_SHOP_MOBILE_DOCK.rightInset,
        bottom: COFFEE_SHOP_MOBILE_DOCK.bottom,
        zIndex: (muiTheme) => muiTheme.zIndex.snackbar,
        pointerEvents: 'auto',
      }}
    >
      <IconButton
        onClick={() => toggleCoffeeShopMobilePanel('chat')}
        aria-label="Open chat"
        aria-pressed={activePanel === 'chat'}
        sx={{ ...coffeeShopMobileFabSx, ...activeFabSx }}
      >
        <Iconify icon="solar:chat-round-dots-bold" width={22} />
      </IconButton>
    </Box>,
    portalTarget,
  );
}
