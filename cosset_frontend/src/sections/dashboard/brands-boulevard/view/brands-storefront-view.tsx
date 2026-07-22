'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  useGetBrandStore,
  useGetBrandProducts,
  useGetBrandCategories,
  purchaseBrandProduct,
} from 'src/actions/brand-store';
import { addChatContact } from 'src/actions/chat';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { getBrandProductImages } from 'src/types/brand-store';

import { BrandProductImageGallery } from '../brand-image-field';

// ----------------------------------------------------------------------

type Props = {
  storeId: string;
};

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

export function BrandsStorefrontView({ storeId }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { store, storeLoading } = useGetBrandStore(storeId);
  const { categories, categoriesLoading } = useGetBrandCategories(storeId);
  const { products, productsLoading } = useGetBrandProducts(storeId);
  const [activeCategoryId, setActiveCategoryId] = useState<'all' | number>('all');
  const [coverUrl, setCoverUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState('');
  const [buyingProductId, setBuyingProductId] = useState<number | null>(null);
  const [contactingOwner, setContactingOwner] = useState(false);

  const isOwner = String(store?.ownerCustomerId || '') === String(user?.id || '');

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      const [nextCover, nextLogo, nextAvatar] = await Promise.all([
        resolveImageUrl(store?.coverImage),
        resolveImageUrl(store?.logoImage),
        resolveImageUrl(store?.ownerPhotoURL),
      ]);

      if (!mounted) return;
      setCoverUrl(nextCover);
      setLogoUrl(nextLogo);
      setOwnerAvatarUrl(nextAvatar);
    };

    resolve();

    return () => {
      mounted = false;
    };
  }, [store?.coverImage, store?.logoImage, store?.ownerPhotoURL]);

  const storeSlides = useMemo(
    () => [coverUrl, logoUrl].filter(Boolean).map((src) => ({ src })),
    [coverUrl, logoUrl],
  );
  const storeLightbox = useLightBox(storeSlides);

  const visibleProducts = useMemo(() => {
    const available = products.filter((product) => product.isAvailable !== false);
    if (activeCategoryId === 'all') return available;
    return available.filter((product) => product.categoryId === activeCategoryId);
  }, [products, activeCategoryId]);

  const ownerName =
    `${store?.ownerFirstName || ''} ${store?.ownerLastName || ''}`.trim() ||
    store?.ownerEmail ||
    'Brand owner';
  const ownerInitial = ownerName.charAt(0).toUpperCase() || 'B';

  const handleBuy = async (productId: number, productName: string) => {
    if (!store || buyingProductId) return;

    if (!user?.id) {
      toast.error('Please sign in to buy this product');
      return;
    }

    try {
      setBuyingProductId(productId);
      await purchaseBrandProduct(store.id, productId, { quantity: 1 });
      toast.success(`Purchased ${productName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to purchase product');
    } finally {
      setBuyingProductId(null);
    }
  };

  const handleContactOwner = useCallback(async () => {
    if (!store?.ownerCustomerId || contactingOwner || isOwner) return;

    if (!user?.id) {
      toast.error('Please sign in to contact this shop');
      return;
    }

    try {
      setContactingOwner(true);
      const result = await addChatContact(store.ownerCustomerId);
      const conversationId = String(result?.conversation?.id || '').trim();

      if (!conversationId) {
        toast.error('Unable to start a conversation with this shop');
        return;
      }

      router.push(`${paths.dashboard.chat}?id=${conversationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to contact this shop');
    } finally {
      setContactingOwner(false);
    }
  }, [contactingOwner, isOwner, router, store?.ownerCustomerId, user?.id]);

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
                variant="outlined"
                color="inherit"
                disabled={contactingOwner}
                startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
                onClick={handleContactOwner}
              >
                {contactingOwner ? 'Opening chat...' : 'Contact'}
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
                bottom: -28,
                width: 72,
                height: 72,
                borderRadius: 2,
                objectFit: 'cover',
                border: '3px solid',
                borderColor: 'background.paper',
                bgcolor: 'background.paper',
                cursor: 'zoom-in',
              }}
            />
          ) : null}
        </Box>
        <CardContent sx={{ p: 3, pt: logoUrl ? 5 : 3 }}>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
              flexWrap="wrap"
            >
              <Typography variant="h4">{store.name}</Typography>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Avatar
                  src={ownerAvatarUrl || undefined}
                  alt={ownerName}
                  sx={{ width: 32, height: 32, fontSize: 14 }}
                >
                  {ownerInitial}
                </Avatar>
                <Typography variant="body2" color="text.secondary">
                  by {ownerName}
                </Typography>
              </Stack>
            </Stack>
            {store.tagline ? (
              <Typography variant="subtitle1" color="text.secondary">
                {store.tagline}
              </Typography>
            ) : null}
            {store.description ? (
              <Typography variant="body1" sx={{ maxWidth: 760 }}>
                {store.description}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip size="small" label={`${categories.length} categories`} />
              <Chip
                size="small"
                label={`${products.filter((p) => p.isAvailable !== false).length} products`}
              />
              {!isOwner ? (
                <Button
                  size="small"
                  variant="soft"
                  color="primary"
                  disabled={contactingOwner}
                  startIcon={<Iconify icon="solar:chat-round-dots-bold" width={16} />}
                  onClick={handleContactOwner}
                >
                  {contactingOwner ? 'Opening chat...' : 'Contact shop'}
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
            {visibleProducts.map((product) => (
              <Grid item xs={12} sm={6} md={4} key={product.id}>
                <Card sx={{ height: 1, overflow: 'hidden' }}>
                  <BrandProductImageGallery
                    imageKeys={getBrandProductImages(product)}
                    alt={product.name}
                    height={180}
                  />
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="h6">{product.name}</Typography>
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
                          variant="contained"
                          disabled={buyingProductId === product.id}
                          onClick={() => handleBuy(product.id, product.name)}
                        >
                          {buyingProductId === product.id ? 'Buying...' : 'Buy'}
                        </Button>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
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
    </DashboardContent>
  );
}
