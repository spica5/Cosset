'use client';

import type { CoffeeShopMenuItem } from 'src/utils/coffee-shop-menu';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { Iconify } from 'src/components/universe/iconify';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { fetchCoffeeShopMenu, placeCoffeeShopOrder } from 'src/actions/coffee-shop';
import { getS3SignedUrl } from 'src/utils/helper';

import {
  COFFEE_SHOP_MOBILE_DOCK,
  COFFEE_SHOP_MOBILE_PANEL_EVENT,
  closeCoffeeShopMobilePanel,
  coffeeShopMobileFabSx,
  coffeeShopMobileMenuFormBoxSx,
  toggleCoffeeShopMobilePanel,
  type CoffeeShopMobilePanel,
} from './coffee-shop-mobile-panels';

// ----------------------------------------------------------------------

type Props = {
  coffeeShopId: string;
  isPresent?: boolean;
};

type MenuItemWithUrl = CoffeeShopMenuItem & { resolvedImageUrl?: string };

export function UniverseCoffeeShopMenu({ coffeeShopId, isPresent = true }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { authenticated, user } = useAuthContext();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MenuItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      return undefined;
    }

    const handleMobilePanelChange = (event: Event) => {
      const panel = (event as CustomEvent<CoffeeShopMobilePanel>).detail;
      setOpen(panel === 'menu');
    };

    window.addEventListener(COFFEE_SHOP_MOBILE_PANEL_EVENT, handleMobilePanelChange);

    return () => {
      window.removeEventListener(COFFEE_SHOP_MOBILE_PANEL_EVENT, handleMobilePanelChange);
    };
  }, [isMobile]);

  const handleClosePanel = useCallback(() => {
    if (isMobile) {
      closeCoffeeShopMobilePanel();
      return;
    }

    setOpen(false);
  }, [isMobile]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { items: loaded } = await fetchCoffeeShopMenu(coffeeShopId);
        if (cancelled) {
          return;
        }

        const withUrls = await Promise.all(
          (loaded ?? []).map(async (item) => {
            const raw = item.imageUrl.trim();
            if (!raw) {
              return { ...item, resolvedImageUrl: '' };
            }
            if (raw.startsWith('http://') || raw.startsWith('https://')) {
              return { ...item, resolvedImageUrl: raw };
            }
            const signed = await getS3SignedUrl(raw);
            return { ...item, resolvedImageUrl: signed || '' };
          }),
        );

        if (!cancelled) {
          setItems(withUrls);
          setSelectedId((prev) => {
            if (prev && withUrls.some((i) => i.id === prev)) {
              return prev;
            }
            return withUrls[0]?.id ?? null;
          });
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setSelectedId(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [coffeeShopId]);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  const handleOrder = useCallback(async () => {
    if (!selectedItem || ordering) {
      return;
    }

    setOrdering(true);
    setOrderError(null);
    setOrderMessage(null);

    try {
      const res = await placeCoffeeShopOrder(coffeeShopId, {
        menuItemId: selectedItem.id,
        quantity: 1,
        displayName: authenticated
          ? undefined
          : String(user?.displayName || user?.email || 'Guest'),
      });
      setOrderMessage(res?.message || `Ordered ${selectedItem.name}`);
    } catch (err: unknown) {
      let msg = 'Could not place order.';
      if (typeof err === 'string') {
        msg = err;
      } else if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
        msg = (err as { message: string }).message;
      }
      setOrderError(msg);
    } finally {
      setOrdering(false);
    }
  }, [authenticated, coffeeShopId, ordering, selectedItem, user?.displayName, user?.email]);

  if (!portalTarget) {
    return null;
  }

  const mobileMenuFab =
    isMobile ? (
      <Box
        sx={{
          position: 'fixed',
          left: COFFEE_SHOP_MOBILE_DOCK.left,
          top: COFFEE_SHOP_MOBILE_DOCK.top,
          zIndex: (muiTheme) => muiTheme.zIndex.snackbar,
          pointerEvents: 'auto',
        }}
      >
        <IconButton
          onClick={() => toggleCoffeeShopMobilePanel('menu')}
          aria-label="Open menu"
          aria-pressed={open}
          sx={{
            ...coffeeShopMobileFabSx,
            p: 0,
            overflow: 'hidden',
            ...(open
              ? {
                  border: '2px solid',
                  borderColor: 'warning.main',
                }
              : undefined),
          }}
        >
          {loading ? (
            <CircularProgress size={22} sx={{ color: 'common.white' }} />
          ) : selectedItem?.resolvedImageUrl ? (
            <Box sx={{ position: 'relative', width: 1, height: 1 }}>
              <Box
                component="img"
                src={selectedItem.resolvedImageUrl}
                alt={selectedItem.name}
                sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
              />
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
                }}
              >
                <Iconify icon="solar:cup-hot-bold" width={12} sx={{ color: 'common.white' }} />
              </Box>
            </Box>
          ) : (
            <Iconify icon="solar:cup-hot-bold" width={32} />
          )}
        </IconButton>
      </Box>
    ) : null;

  const panel = (
    <Box
      sx={{
        position: 'fixed',
        left: { xs: coffeeShopMobileMenuFormBoxSx.left, sm: 24 },
        top: { xs: coffeeShopMobileMenuFormBoxSx.top, sm: 24 },
        right: { xs: COFFEE_SHOP_MOBILE_DOCK.rightInset, sm: 'auto' },
        bottom: 'auto',
        zIndex: (tm) => tm.zIndex.snackbar,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 1.25,
        pointerEvents: 'auto',
        width: { xs: coffeeShopMobileMenuFormBoxSx.width, sm: 'auto' },
        maxWidth: { xs: coffeeShopMobileMenuFormBoxSx.maxWidth, sm: 320 },
        maxHeight: { xs: coffeeShopMobileMenuFormBoxSx.maxHeight, sm: 'none' },
      }}
    >
      {selectedItem?.resolvedImageUrl ? (
        <Paper
          elevation={8}
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: 'rgba(15, 20, 28, 0.88)',
            border: '1px solid rgba(255,255,255,0.14)',
            backdropFilter: 'blur(10px)',
            width: { xs: 1, sm: 200 },
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: 140,
              borderRadius: 1,
              bgcolor: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={selectedItem.resolvedImageUrl}
              alt={selectedItem.name}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Box>
          <Typography variant="subtitle2" sx={{ color: 'common.white', mt: 1, px: 0.5 }}>
            {selectedItem.name}
          </Typography>
          {selectedItem.price != null ? (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', px: 0.5 }}>
              ${selectedItem.price.toFixed(2)}
            </Typography>
          ) : null}
        </Paper>
      ) : null}

      <Paper
        elevation={12}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'rgba(15, 20, 28, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          width: { xs: 1, sm: 250 },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
            cursor: isMobile ? 'default' : 'pointer',
          }}
          onClick={isMobile ? undefined : () => setOpen((v) => !v)}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:cup-hot-bold" width={22} sx={{ color: 'common.white' }} />
            <Typography variant="subtitle2" sx={{ color: 'common.white' }}>
              Menu
            </Typography>
          </Stack>
          <IconButton
            size="small"
            sx={{ color: 'common.white' }}
            onClick={(e) => {
              e.stopPropagation();
              if (isMobile) {
                handleClosePanel();
              } else {
                setOpen((v) => !v);
              }
            }}
            aria-label={isMobile ? 'Close menu' : open ? 'Collapse menu' : 'Expand menu'}
          >
            <Iconify
              icon={isMobile ? 'mingcute:close-line' : open ? 'eva:arrow-down-fill' : 'eva:arrow-up-fill'}
              width={20}
            />
          </IconButton>
        </Stack>

        <Collapse in={isMobile ? true : open}>
          <Stack sx={{ p: 1.5, pt: 0 }} spacing={1.25}>
            {isMobile && selectedItem?.resolvedImageUrl ? (
              <Box
                sx={{
                  width: 1,
                  height: 140,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src={selectedItem.resolvedImageUrl}
                  alt={selectedItem.name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </Box>
            ) : null}
            {loading ? (
              <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} sx={{ color: 'common.white' }} />
              </Box>
            ) : items.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', py: 1 }}>
                No drinks on the menu yet.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ maxHeight: { xs: '40vh', sm: 220 }, overflowY: 'auto' }}>
                {items.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <Stack
                      key={item.id}
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                      role="button"
                      tabIndex={0}
                            onClick={() => {
                              if (!isPresent) return;
                              setSelectedId(item.id);
                              setOrderMessage(null);
                              setOrderError(null);
                            }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(item.id);
                        }
                      }}
                      sx={{
                        p: 0.75,
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: isSelected
                          ? '2px solid rgba(255,255,255,0.9)'
                          : '1px solid rgba(255,255,255,0.15)',
                        bgcolor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          bgcolor: 'rgba(255,255,255,0.08)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {item.resolvedImageUrl ? (
                          <Box
                            component="img"
                            src={item.resolvedImageUrl}
                            alt={item.name}
                            sx={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        ) : null}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ color: 'common.white' }} noWrap>
                          {item.name}
                        </Typography>
                        {item.price != null ? (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                            ${item.price.toFixed(2)}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            )}

            {orderMessage ? (
              <Typography variant="caption" sx={{ color: 'success.light' }}>
                {orderMessage}
              </Typography>
            ) : null}
            {orderError ? (
              <Typography variant="caption" color="error">
                {orderError}
              </Typography>
            ) : null}

            <Button
              type="button"
              fullWidth
              variant="contained"
              disabled={!isPresent || !selectedItem || ordering || loading || items.length === 0}
              onClick={() => handleOrder()}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {ordering ? 'Ordering…' : 'Order selected'}
            </Button>
            {!isPresent && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                You are not present in this coffee shop — ordering is disabled.
              </Typography>
            )}
          </Stack>
        </Collapse>
      </Paper>
  </Box>
  );

  return createPortal(
    <>
      {mobileMenuFab}
      {!isMobile || open ? panel : null}
    </>,
    portalTarget,
  );
}
