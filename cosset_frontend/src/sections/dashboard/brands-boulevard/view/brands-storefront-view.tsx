'use client';

import type { IBrandProduct } from 'src/types/brand-store';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  useGetBrandStore,
  useGetBrandProducts,
  recordBrandStoreView,
  useGetBrandCategories,
  fetchBrandStoreFavorites,
  toggleBrandStoreFavorite,
  fetchBrandProductWishlist,
  toggleBrandProductWishlist,
} from 'src/actions/brand-store';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import {
  getBrandProductImages,
  getBrandProductStatusColor,
  getBrandProductStatusLabel,
  normalizeBrandProductStatus,
} from 'src/types/brand-store';

import { BrandStoreChatBox } from '../brand-store-chat-box';
import { BrandProductImageGallery } from '../brand-image-field';

// ----------------------------------------------------------------------

type Props = {
  storeId: string;
};

function formatCount(value?: number | null) {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  return n.toLocaleString();
}

function parseProductPrice(value?: string | null) {
  const n = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount: number, currency?: string | null) {
  const code = (currency || 'USD').trim() || 'USD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

async function resolveImageUrl(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  return (await getS3SignedUrl(raw.replace(/^public:/, ''))) || '';
}

function WishlistCheckoutThumb({ product }: { product: IBrandProduct }) {
  const [src, setSrc] = useState('');
  const imageKey = getBrandProductImages(product)[0] || '';

  useEffect(() => {
    let mounted = true;
    resolveImageUrl(imageKey).then((url) => {
      if (mounted) setSrc(url);
    });
    return () => {
      mounted = false;
    };
  }, [imageKey]);

  if (!src) {
    return (
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 1.25,
          flexShrink: 0,
          bgcolor: 'background.neutral',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Iconify icon="solar:box-bold-duotone" width={22} sx={{ color: 'text.disabled' }} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={product.name}
      sx={{
        width: 56,
        height: 56,
        borderRadius: 1.25,
        flexShrink: 0,
        objectFit: 'cover',
        bgcolor: 'background.neutral',
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  );
}

function WishlistCheckoutList({
  products,
  removingProductId,
  onRemove,
  dense = false,
}: {
  products: IBrandProduct[];
  removingProductId: number | null;
  onRemove: (product: IBrandProduct) => void;
  dense?: boolean;
}) {
  const currency = products.find((product) => product.currency)?.currency || 'USD';
  const total = products.reduce((sum, product) => sum + parseProductPrice(product.price), 0);

  return (
    <Stack spacing={dense ? 1.5 : 2}>
      <Stack spacing={1.25} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
        {products.map((product) => (
          <Stack
            key={product.id}
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ py: dense ? 0.25 : 0.5 }}
          >
            <WishlistCheckoutThumb product={product} />
            <ListItemText
              primary={
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {product.name}
                  </Typography>
                  <Chip size="small" color="info" label="Wishlist" sx={{ height: 20 }} />
                </Stack>
              }
              secondary={
                <Stack spacing={0.15} sx={{ mt: 0.25 }}>
                  {product.productCode ? (
                    <Typography variant="caption" color="text.secondary">
                      Code: {product.productCode}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {product.categoryName || 'Uncategorized'}
                  </Typography>
                </Stack>
              }
              primaryTypographyProps={{ component: 'div' }}
              secondaryTypographyProps={{ component: 'div' }}
              sx={{ flex: '1 1 auto', minWidth: 0 }}
            />
            <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {product.price
                  ? formatMoney(parseProductPrice(product.price), product.currency || currency)
                  : '—'}
              </Typography>
              <IconButton
                size="small"
                color="error"
                disabled={removingProductId === product.id}
                onClick={() => onRemove(product)}
                aria-label={`Remove ${product.name} from wishlist`}
              >
                <Iconify
                  icon={
                    removingProductId === product.id
                      ? 'svg-spinners:180-ring'
                      : 'solar:trash-bin-trash-bold'
                  }
                  width={18}
                />
              </IconButton>
            </Stack>
          </Stack>
        ))}
      </Stack>

      <Divider />

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          {products.length} item{products.length === 1 ? '' : 's'}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {formatMoney(total, currency)}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function BrandsStorefrontView({ storeId }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { store, storeLoading } = useGetBrandStore(storeId);
  const { categories, categoriesLoading } = useGetBrandCategories(storeId);
  const { products, productsLoading } = useGetBrandProducts(storeId);
  const [activeCategoryId, setActiveCategoryId] = useState<'all' | number>('all');
  const [coverUrl, setCoverUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState('');
  const [wishlistingProductId, setWishlistingProductId] = useState<number | null>(null);
  const [wishlistProductIds, setWishlistProductIds] = useState<number[]>([]);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);

  const isOwner = String(store?.ownerCustomerId || '') === String(user?.id || '');
  const wishlistSet = useMemo(
    () => new Set(wishlistProductIds.map(Number)),
    [wishlistProductIds],
  );

  const wishlistProducts = useMemo(
    () => products.filter((product) => wishlistSet.has(Number(product.id))),
    [products, wishlistSet],
  );

  const myWishlistItemCount = wishlistProducts.length;

  useEffect(() => {
    setFavoriteCount(store?.favoriteCount || 0);
    setWishlistCount(store?.wishlistCount || 0);
    setVisitCount(store?.totalViews || 0);
  }, [store?.favoriteCount, store?.wishlistCount, store?.totalViews]);

  useEffect(() => {
    if (!store?.id || !user?.id || isOwner) return;

    recordBrandStoreView(store.id)
      .then((result) => {
        if (typeof result?.totalViews === 'number') {
          setVisitCount(result.totalViews);
        }
      })
      .catch(() => undefined);
  }, [store?.id, user?.id, isOwner]);

  useEffect(() => {
    if (!store?.id || !user?.id) {
      setIsFavorite(false);
      setWishlistProductIds([]);
      return undefined;
    }

    let mounted = true;
    fetchBrandStoreFavorites()
      .then((ids) => {
        if (mounted) setIsFavorite(ids.includes(Number(store.id)));
      })
      .catch(() => undefined);

    fetchBrandProductWishlist({ storeId: Number(store.id) })
      .then(({ productIds }) => {
        if (mounted) setWishlistProductIds(productIds);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [store?.id, user?.id]);

  const handleToggleFavorite = useCallback(async () => {
    if (!store?.id) return;
    if (!user?.id) {
      toast.error('Sign in to favorite this shop');
      return;
    }
    if (favoriteSaving) return;

    try {
      setFavoriteSaving(true);
      const result = await toggleBrandStoreFavorite(store.id);
      setIsFavorite(result.isFavorite);
      setFavoriteCount(result.favoriteCount);
      toast.success(result.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorite');
    } finally {
      setFavoriteSaving(false);
    }
  }, [favoriteSaving, store?.id, user?.id]);

  const handleToggleWishlist = useCallback(
    async (productId: number, productName: string) => {
      if (!store?.id) return;

      if (!user?.id) {
        toast.error('Please sign in to add items to your wishlist');
        return;
      }

      if (isOwner) {
        toast.error('Store owners cannot wishlist their own products');
        return;
      }

      if (wishlistingProductId) return;

      try {
        setWishlistingProductId(productId);
        const result = await toggleBrandProductWishlist(store.id, productId);
        setWishlistProductIds((prev) =>
          result.isWishlisted
            ? [...prev.filter((id) => id !== productId), productId]
            : prev.filter((id) => id !== productId),
        );
        setWishlistCount(result.wishlistCount);
        toast.success(
          result.isWishlisted
            ? `${productName} added to wishlist`
            : `${productName} removed from wishlist`,
        );
        if (result.isWishlisted) {
          setWishlistDrawerOpen(true);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update wishlist');
      } finally {
        setWishlistingProductId(null);
      }
    },
    [isOwner, store?.id, user?.id, wishlistingProductId],
  );

  const handleOpenWishlistCheckout = useCallback(() => {
    if (!user?.id) {
      toast.error('Please sign in to view your wishlist');
      return;
    }
    setWishlistDrawerOpen(true);
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      const [nextCover, nextLogo, nextIntro, nextAvatar] = await Promise.all([
        resolveImageUrl(store?.coverImage),
        resolveImageUrl(store?.logoImage),
        resolveImageUrl(store?.introVideo),
        resolveImageUrl(store?.ownerPhotoURL),
      ]);

      if (!mounted) return;
      setCoverUrl(nextCover);
      setLogoUrl(nextLogo);
      setIntroVideoUrl(nextIntro);
      setOwnerAvatarUrl(nextAvatar);
    };

    resolve();

    return () => {
      mounted = false;
    };
  }, [store?.coverImage, store?.logoImage, store?.introVideo, store?.ownerPhotoURL]);

  useEffect(() => {
    const video = introVideoRef.current;
    if (!video || !introVideoUrl) return undefined;

    const tryPlay = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => undefined);
      }
    };

    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('canplay', tryPlay);
    tryPlay();

    return () => {
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('canplay', tryPlay);
      video.pause();
    };
  }, [introVideoUrl]);

  const storeSlides = useMemo(
    () => [coverUrl, logoUrl].filter(Boolean).map((src) => ({ src })),
    [coverUrl, logoUrl],
  );
  const storeLightbox = useLightBox(storeSlides);

  const visibleProducts = useMemo(() => {
    if (activeCategoryId === 'all') return products;
    return products.filter((product) => product.categoryId === activeCategoryId);
  }, [products, activeCategoryId]);

  const ownerName =
    `${store?.ownerFirstName || ''} ${store?.ownerLastName || ''}`.trim() ||
    store?.ownerEmail ||
    'Brand owner';
  const ownerInitial = ownerName.charAt(0).toUpperCase() || 'B';

  const handleOpenShopChat = useCallback(() => {
    if (isOwner) return;

    if (!user?.id) {
      toast.error('Please sign in to chat with this shop');
      return;
    }

    setChatOpen(true);
  }, [isOwner, user?.id]);

  const handleCloseShopChat = useCallback(() => {
    setChatOpen(false);
  }, []);

  if (storeLoading) {
    return (
      <DashboardContent>
        <Typography variant="body2" color="text.secondary">
          Loading storefront...
        </Typography>
      </DashboardContent>
    );
  }

  if (!store) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Store not found"
          description="This storefront is not available on Brands Boulevard."
          sx={{ py: 10 }}
          action={
            <Button
              variant="contained"
              onClick={() => router.push(paths.dashboard.community.brandsBoulevard.root)}
            >
              Back to boulevard
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={store.name}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: 'Brands Boulevard', href: paths.dashboard.community.brandsBoulevard.root },
          { name: store.name },
        ]}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {!isOwner ? (
              <Button
                variant={myWishlistItemCount > 0 ? 'contained' : 'outlined'}
                color="inherit"
                disabled={!user?.id}
                startIcon={
                  <Badge
                    color="error"
                    badgeContent={myWishlistItemCount}
                    max={99}
                    invisible={myWishlistItemCount <= 0}
                  >
                    <Iconify icon="solar:bag-heart-bold" />
                  </Badge>
                }
                onClick={handleOpenWishlistCheckout}
              >
                Wishlist
              </Button>
            ) : null}
            <Button
              variant={isFavorite ? 'contained' : 'outlined'}
              color={isFavorite ? 'error' : 'inherit'}
              disabled={favoriteSaving || !user?.id}
              startIcon={
                <Iconify icon={isFavorite ? 'solar:heart-bold' : 'solar:heart-linear'} />
              }
              onClick={handleToggleFavorite}
            >
              {isFavorite ? 'Favorited' : 'Favorite'}
            </Button>
            {!isOwner ? (
              <Button
                variant="outlined"
                color="inherit"
                disabled={!user?.id}
                startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
                onClick={handleOpenShopChat}
              >
                Chat
              </Button>
            ) : null}
            {isOwner ? (
              <Button
                variant="contained"
                onClick={() => router.push(paths.dashboard.community.brandsBoulevard.myStore)}
              >
                Manage my store
              </Button>
            ) : null}
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ mb: 3, overflow: 'hidden' }}>
        <Box
          onClick={
            coverUrl
              ? () =>
                  storeLightbox.setSelected(
                    storeSlides.findIndex((slide) => slide.src === coverUrl),
                  )
              : undefined
          }
          sx={{
            position: 'relative',
            height: { xs: 280, md: 360 },
            cursor: coverUrl ? 'zoom-in' : 'default',
            background: coverUrl
              ? `url(${coverUrl}) center / cover no-repeat`
              : 'linear-gradient(135deg, #3d2a1f 0%, #c9a66b 100%)',
          }}
        >
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt={`${store.name} logo`}
              onClick={(event) => {
                event.stopPropagation();
                storeLightbox.setSelected(storeSlides.findIndex((slide) => slide.src === logoUrl));
              }}
              sx={{
                position: 'absolute',
                left: 20,
                bottom: 20,
                width: 84,
                height: 84,
                borderRadius: 2,
                objectFit: 'cover',
                border: '3px solid rgba(255,255,255,0.92)',
                bgcolor: 'background.paper',
                cursor: 'zoom-in',
              }}
            />
          ) : null}
        </Box>

        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar src={ownerAvatarUrl || undefined} alt={ownerName} sx={{ width: 44, height: 44 }}>
                {ownerInitial}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4">{store.name}</Typography>
                {store.tagline ? (
                  <Typography variant="body2" color="text.secondary">
                    {store.tagline}
                  </Typography>
                ) : null}
              </Box>
            </Stack>

            {store.description || introVideoUrl ? (
              <Grid container spacing={2} alignItems="flex-start">
                {store.description ? (
                  <Grid item xs={12} md={introVideoUrl ? 8 : 12}>
                    <Typography variant="body2" color="text.secondary">
                      {store.description}
                    </Typography>
                  </Grid>
                ) : null}
                {introVideoUrl ? (
                  <Grid item xs={12} md={store.description ? 4 : 12}>
                    <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Box
                        component="video"
                        ref={introVideoRef}
                        src={introVideoUrl}
                        controls
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="auto"
                        sx={{
                          display: 'block',
                          width: 1,
                          aspectRatio: '16 / 9',
                          objectFit: 'cover',
                          bgcolor: 'common.black',
                        }}
                      />
                    </Box>
                  </Grid>
                ) : null}
              </Grid>
            ) : null}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip
                size="small"
                icon={<Iconify icon="solar:eye-bold" width={14} />}
                label={`${formatCount(visitCount)} visits`}
              />
              <Chip
                size="small"
                icon={<Iconify icon="solar:heart-bold" width={14} />}
                label={`${formatCount(favoriteCount)} likes`}
              />
              <Chip
                size="small"
                icon={<Iconify icon="solar:bookmark-bold" width={14} />}
                label={`${formatCount(wishlistCount)} wishlist`}
              />
              <Chip size="small" label={`${categories.length} categories`} />
              <Chip size="small" label={`${products.length} products`} />
              {!isOwner ? (
                <Button
                  size="small"
                  variant="soft"
                  color="primary"
                  disabled={!user?.id}
                  startIcon={<Iconify icon="solar:chat-round-dots-bold" width={16} />}
                  onClick={handleOpenShopChat}
                >
                  Chat with shop
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={3}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            clickable
            color={activeCategoryId === 'all' ? 'primary' : 'default'}
            label="All"
            onClick={() => setActiveCategoryId('all')}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              clickable
              color={activeCategoryId === category.id ? 'primary' : 'default'}
              label={category.name}
              onClick={() => setActiveCategoryId(category.id)}
            />
          ))}
        </Stack>

        {categoriesLoading || productsLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading catalog...
          </Typography>
        ) : visibleProducts.length ? (
          <Grid container spacing={2}>
            {visibleProducts.map((product) => {
              const isWishlisted = wishlistSet.has(Number(product.id));
              const displayStatus = isWishlisted
                ? 'wishlist'
                : normalizeBrandProductStatus(product);

              return (
                <Grid item xs={12} sm={6} md={4} key={product.id}>
                  <Card sx={{ height: 1, overflow: 'hidden' }}>
                    <BrandProductImageGallery
                      imageKeys={getBrandProductImages(product)}
                      alt={product.name}
                      height={180}
                    />
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="h6">{product.name}</Typography>
                          <Chip
                            size="small"
                            color={getBrandProductStatusColor(displayStatus)}
                            label={getBrandProductStatusLabel(displayStatus)}
                          />
                        </Stack>
                        {product.productCode ? (
                          <Typography variant="caption" color="text.secondary">
                            Code: {product.productCode}
                          </Typography>
                        ) : null}
                        <Typography variant="caption" color="text.secondary">
                          {product.categoryName || 'Uncategorized'}
                        </Typography>
                        {product.description ? (
                          <Typography variant="body2" color="text.secondary">
                            {product.description}
                          </Typography>
                        ) : null}
                        {product.price ? (
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {product.currency || 'USD'} {product.price}
                          </Typography>
                        ) : null}
                        {!isOwner ? (
                          <Button
                            fullWidth
                            variant={isWishlisted ? 'outlined' : 'contained'}
                            color={isWishlisted ? 'inherit' : 'primary'}
                            disabled={wishlistingProductId === product.id || !user?.id}
                            startIcon={
                              <Iconify
                                icon={
                                  isWishlisted ? 'solar:bookmark-bold' : 'solar:bookmark-linear'
                                }
                              />
                            }
                            onClick={() => handleToggleWishlist(product.id, product.name)}
                          >
                            {wishlistingProductId === product.id
                              ? 'Saving...'
                              : isWishlisted
                                ? 'On wishlist'
                                : 'Add Wishlist'}
                          </Button>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <EmptyContent
            filled
            title="No products in this aisle yet"
            description="The brand is still arranging their shelves."
            sx={{ py: 8 }}
          />
        )}
      </Stack>

      <Lightbox
        index={storeLightbox.selected}
        slides={storeSlides}
        open={storeLightbox.open}
        close={storeLightbox.onClose}
        disableCaptions
        disableSlideshow
        disableThumbnails
      />

      <Drawer
        anchor="right"
        open={wishlistDrawerOpen}
        onClose={() => setWishlistDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: 1, sm: 420 }, p: 2.5 } }}
      >
        <Stack spacing={2} sx={{ height: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack spacing={0.25}>
              <Typography variant="h6">Wishlist checkout</Typography>
              <Typography variant="caption" color="text.secondary">
                Shopping list · {store.name}
              </Typography>
            </Stack>
            <IconButton onClick={() => setWishlistDrawerOpen(false)} aria-label="Close wishlist">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          {myWishlistItemCount ? (
            <>
              <WishlistCheckoutList
                dense
                products={wishlistProducts}
                removingProductId={wishlistingProductId}
                onRemove={(product) => handleToggleWishlist(product.id, product.name)}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Stack spacing={1}>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
                  onClick={() => {
                    setWishlistDrawerOpen(false);
                    handleOpenShopChat();
                  }}
                >
                  Chat about wishlist
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  onClick={() => setWishlistDrawerOpen(false)}
                >
                  Continue shopping
                </Button>
              </Stack>
            </>
          ) : (
            <EmptyContent
              filled
              title="Wishlist is empty"
              description="Tap Add Wishlist on a product to build your shopping list."
              sx={{ py: 6 }}
            />
          )}
        </Stack>
      </Drawer>

      {!isOwner && store.ownerCustomerId ? (
        <BrandStoreChatBox
          open={chatOpen}
          onOpen={handleOpenShopChat}
          onClose={handleCloseShopChat}
          ownerCustomerId={String(store.ownerCustomerId)}
          shopName={store.name}
          ownerName={ownerName}
          ownerAvatarUrl={ownerAvatarUrl}
          wishlistCount={myWishlistItemCount}
          onOpenWishlist={handleOpenWishlistCheckout}
        />
      ) : null}
    </DashboardContent>
  );
}
