'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { Iconify } from 'src/components/universe/iconify';

import {
  COFFEE_SHOP_MOBILE_DOCK,
  coffeeShopMobileFabSx,
  subscribeCoffeeShopMobilePanel,
  subscribeCoffeeShopChatUnread,
  toggleCoffeeShopMobilePanel,
  type CoffeeShopMobilePanel,
} from './coffee-shop-mobile-panels';

// ----------------------------------------------------------------------

export function UniverseCoffeeShopMobileDock() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activePanel, setActivePanel] = useState<CoffeeShopMobilePanel>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => subscribeCoffeeShopMobilePanel(setActivePanel), []);
  useEffect(() => subscribeCoffeeShopChatUnread(setUnreadCount), []);

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
      <Badge
        color="error"
        badgeContent={unreadCount}
        max={99}
        invisible={unreadCount <= 0 || activePanel === 'chat'}
        overlap="circular"
        sx={{
          '& .MuiBadge-badge': {
            fontWeight: 700,
            minWidth: 18,
            height: 18,
            fontSize: '0.7rem',
          },
        }}
      >
        <IconButton
          onClick={() => toggleCoffeeShopMobilePanel('chat')}
          aria-label={unreadCount > 0 ? `Open chat, ${unreadCount} unread` : 'Open chat'}
          aria-pressed={activePanel === 'chat'}
          sx={{ ...coffeeShopMobileFabSx, ...activeFabSx }}
        >
          <Iconify icon="solar:chat-round-dots-bold" width={22} />
        </IconButton>
      </Badge>
    </Box>,
    portalTarget,
  );
}
