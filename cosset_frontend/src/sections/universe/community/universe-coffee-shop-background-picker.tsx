'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/universe/iconify';

import {
  COFFEE_SHOP_MOBILE_DOCK,
  coffeeShopMobileFabSx,
} from './coffee-shop-mobile-panels';

// ----------------------------------------------------------------------

type Props = {
  imageUrls: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function UniverseCoffeeShopBackgroundPicker({
  imageUrls,
  selectedIndex,
  onSelect,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  if (imageUrls.length <= 1) {
    return null;
  }

  const activeImageUrl = imageUrls[Math.min(selectedIndex, imageUrls.length - 1)] || imageUrls[0];

  return (
    <Box
      sx={{
        position: 'fixed',
        left: COFFEE_SHOP_MOBILE_DOCK.left,
        bottom: COFFEE_SHOP_MOBILE_DOCK.bottom,
        zIndex: theme.zIndex.snackbar,
        pointerEvents: 'auto',
        maxWidth: `calc(100vw - ${COFFEE_SHOP_MOBILE_DOCK.left + COFFEE_SHOP_MOBILE_DOCK.rightInset + COFFEE_SHOP_MOBILE_DOCK.fabSize}px)`,
      }}
    >
      <Stack direction="row" alignItems="flex-end" spacing={1}>
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <IconButton
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Hide backgrounds' : 'Show backgrounds'}
            aria-pressed={open}
            sx={{
              ...coffeeShopMobileFabSx,
              p: 0,
              overflow: 'hidden',
              ...(open
                ? {
                    border: '2px solid',
                    borderColor: 'success.main',
                  }
                : undefined),
            }}
          >
            <Box
              component="img"
              src={activeImageUrl}
              alt="Selected background"
              sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
            />
          </IconButton>

          <Box
            sx={{
              position: 'absolute',
              right: 3,
              bottom: 3,
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: 'rgba(15, 20, 28, 0.92)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}
          >
            <Iconify icon="solar:gallery-bold" width={12} sx={{ color: 'common.white' }} />
          </Box>

          {!open && imageUrls.length > 1 ? (
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 20,
                height: 20,
                px: 0.5,
                borderRadius: 10,
                bgcolor: 'success.main',
                color: 'common.white',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(15, 20, 28, 0.88)',
              }}
            >
              {imageUrls.length}
            </Box>
          ) : null}
        </Box>

        {open ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              py: 0.75,
              px: 1,
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              overflowX: 'auto',
              overflowY: 'hidden',
              maxWidth: `calc(100vw - ${COFFEE_SHOP_MOBILE_DOCK.left + COFFEE_SHOP_MOBILE_DOCK.fabSize + COFFEE_SHOP_MOBILE_DOCK.rightInset + COFFEE_SHOP_MOBILE_DOCK.fabSize}px)`,
            }}
          >
            {imageUrls.map((url, index) => (
              <Box
                key={`${index}-${url.slice(0, 40)}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(index);
                  }
                }}
                sx={{
                  width: COFFEE_SHOP_MOBILE_DOCK.fabSize,
                  height: COFFEE_SHOP_MOBILE_DOCK.fabSize,
                  flexShrink: 0,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  backgroundImage: `url(${url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border:
                    index === selectedIndex
                      ? '2px solid rgba(255,255,255,0.95)'
                      : '1px solid rgba(255,255,255,0.25)',
                  boxShadow:
                    index === selectedIndex ? '0 0 0 2px rgba(0,0,0,0.35)' : undefined,
                  opacity: index === selectedIndex ? 1 : 0.85,
                  '&:hover': { opacity: 1 },
                }}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
