'use client';

import type { IGiftItem } from 'src/types/gift';
import type { Slide } from 'yet-another-react-lightbox';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { getS3SignedUrl } from 'src/utils/helper';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/universe/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
  categoryKey: string;
};

type GiftWithImages = IGiftItem & {
  imageUrls: string[];
};

const isPublicGift = (openness?: string) => {
  const value = String(openness || '').toLowerCase();
  return value === 'public' || value === '1' || value === 'true';
};

const isCategoryMatch = (giftCategory: string | null | undefined, categoryKey: string) => {
  const value = String(giftCategory || '').trim().toLowerCase();

  if (categoryKey === 'gift') {
    return value === '' || value === 'gift' || value === 'gifts';
  }

  return value === categoryKey.toLowerCase();
};

const categoryLabelMap: Record<string, string> = {
  gift: 'Gifts and Souvenir',
  goodMemo: 'Good Memories',
  sadMemo: 'Sad Memories',
  video: 'Videos',
};

export function UniverseDrawerView({ customerId, categoryKey }: Props) {
  const [items, setItems] = useState<GiftWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadDrawerItems = async () => {
      try {
        setLoading(true);

        const response = await axiosInstance.get(endpoints.gift.list, {
          params: { customerId, limit: 200, offset: 0 },
        });

        const gifts = (response.data?.gifts ?? []) as IGiftItem[];

        const filtered = gifts.filter(
          (gift) => isPublicGift(gift.openness) && isCategoryMatch(gift.category, categoryKey)
        );

        const withImages = await Promise.all(
          filtered.map(async (gift) => {
            let imageKeys: string[] = [];

            try {
              if (typeof gift.images === 'string') {
                const parsed = JSON.parse(gift.images);
                if (Array.isArray(parsed)) {
                  imageKeys = parsed.filter((value): value is string => typeof value === 'string');
                }
              } else if (Array.isArray(gift.images)) {
                imageKeys = (gift.images as unknown[]).filter(
                  (value): value is string => typeof value === 'string'
                );
              }
            } catch {
              imageKeys = [];
            }

            const signedUrls = await Promise.all(
              imageKeys.map(async (key) => {
                if (!key) return '';
                if (key.startsWith('http://') || key.startsWith('https://')) return key;

                const signed = await getS3SignedUrl(key);
                return signed || '';
              })
            );

            return {
              ...gift,
              imageUrls: signedUrls.filter(Boolean),
            };
          })
        );

        if (!mounted) return;
        setItems(withImages);
      } catch (error) {
        console.error('Failed to load universe drawer items:', error);
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDrawerItems();

    return () => {
      mounted = false;
    };
  }, [categoryKey, customerId]);

  const categoryLabel = categoryLabelMap[categoryKey] || categoryKey;

  const slideItems = useMemo(
    () =>
      items.flatMap((gift) =>
        gift.imageUrls.map((url) => ({
          src: url,
          alt: gift.title || 'Drawer image',
          description: gift.description || undefined,
        }))
      ),
    [items]
  );

  const lightboxSlides: Slide[] = slideItems;
  const lightbox = useLightBox(lightboxSlides);

  const customerViewHref = paths.universe.view(customerId);

  if (loading) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading drawer items...</Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
      <Container>
        <Stack spacing={3}>
          <Link
            component={RouterLink}
            href={customerViewHref}
            underline="none"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
              typography: 'body2',
            }}
          >
            <Iconify icon="solar:alt-arrow-left-outline" />
            Back
          </Link>

          <Stack spacing={1}>
            <Typography variant="h2">{categoryLabel}</Typography>
            <Typography variant="body2" color="text.secondary">
              {items.length} item{items.length === 1 ? '' : 's'} shared
            </Typography>
          </Stack>

          {items.length === 0 ? (
            <Typography color="text.secondary">No shared items found for this drawer category.</Typography>
          ) : (
            <Grid container spacing={2}>
              {items.map((item) => {
                const firstImage = item.imageUrls[0] || '';
                const slideStartIndex = slideItems.findIndex(
                  (slide) => slide.src === firstImage && slide.alt === (item.title || 'Drawer image')
                );

                return (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <Card
                      onClick={() => {
                        if (firstImage && slideStartIndex >= 0) {
                          lightbox.setSelected(slideStartIndex);
                        }
                      }}
                      sx={{
                        height: 1,
                        cursor: firstImage ? 'pointer' : 'default',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '&:hover img': { transform: 'scale(1.04)' },
                      }}
                    >
                      <Box
                        component="img"
                        src={firstImage}
                        alt={item.title}
                        sx={{
                          width: 1,
                          height: 220,
                          objectFit: 'cover',
                          bgcolor: 'background.neutral',
                          transition: (theme) =>
                            theme.transitions.create('transform', {
                              duration: theme.transitions.duration.shorter,
                            }),
                        }}
                      />
                      <CardContent
                        sx={{
                          bgcolor: 'background.neutral',
                          borderTop: '1px dashed',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack spacing={0.75}>
                          <Typography variant="h6" noWrap>
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {item.description || 'No description'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            From {item.receivedFrom || 'Unknown'}
                            {item.receivedDate ? ` • ${fDate(item.receivedDate)}` : ''}
                          </Typography>
                          <Link
                            component={RouterLink}
                            href={paths.universe.gift(customerId, item.id)}
                            underline="none"
                            onClick={(event) => event.stopPropagation()}
                            sx={{ typography: 'body2', color: 'primary.main' }}
                          >
                            View gift
                          </Link>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Stack>
      </Container>

      <Lightbox
        slides={lightboxSlides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />
    </Box>
  );
}
