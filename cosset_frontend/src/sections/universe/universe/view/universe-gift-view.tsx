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
  giftId: string;
};

export function UniverseGiftView({ customerId, giftId }: Props) {
  const [gift, setGift] = useState<IGiftItem | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const slides: Slide[] = useMemo(
    () =>
      imageUrls.map((url) => ({
        src: url,
        alt: gift?.title || 'Gift image',
        description: gift?.description || undefined,
      })),
    [gift?.description, gift?.title, imageUrls]
  );

  const lightbox = useLightBox(slides);

  useEffect(() => {
    let mounted = true;

    const loadGift = async () => {
      try {
        setLoading(true);

        const res = await axiosInstance.get(endpoints.gift.list, {
          params: { customerId, limit: 200, offset: 0 },
        });

        const gifts = (res.data?.gifts ?? []) as IGiftItem[];
        const giftData = gifts.find((item) => String(item.id) === String(giftId)) ?? null;

        if (!giftData) {
          if (mounted) {
            setGift(null);
            setImageUrls([]);
          }
          return;
        }

        let imageKeys: string[] = [];

        try {
          if (typeof giftData.images === 'string') {
            const parsed = JSON.parse(giftData.images);
            if (Array.isArray(parsed)) {
              imageKeys = parsed.filter((value): value is string => typeof value === 'string');
            }
          } else if (Array.isArray(giftData.images)) {
            imageKeys = (giftData.images as unknown[]).filter(
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

        if (!mounted) return;

        setGift(giftData);
        setImageUrls(signedUrls.filter(Boolean));
      } catch (error) {
        console.error('Failed to load universe gift view data:', error);
        if (mounted) {
          setGift(null);
          setImageUrls([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadGift();

    return () => {
      mounted = false;
    };
  }, [customerId, giftId]);

  const customerViewHref = customerId ? paths.universe.view(customerId) : paths.home;

  if (loading) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading gift...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!gift) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h4">Gift not found</Typography>
          <Typography color="text.secondary">This gift is unavailable or has been removed.</Typography>
          <Link component={RouterLink} href={paths.home} underline="none" sx={{ color: 'primary.main' }}>
            Back to home
          </Link>
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
            <Typography variant="h2">{gift.title}</Typography>
            <Typography variant="body1" color="text.secondary">
              {gift.description || 'No description'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {gift.category || 'Uncategorized'}
              {gift.receivedFrom ? ` • From ${gift.receivedFrom}` : ''}
              {gift.receivedDate ? ` • ${fDate(gift.receivedDate)}` : ''}
            </Typography>
          </Stack>

          {imageUrls.length === 0 ? (
            <Typography color="text.secondary">No images in this gift.</Typography>
          ) : (
            <Grid container spacing={2}>
              {imageUrls.map((url, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`${gift.id}-${index}`}>
                  <Card
                    onClick={() => lightbox.setSelected(index)}
                    sx={{
                      cursor: 'pointer',
                      overflow: 'hidden',
                      borderRadius: 1.5,
                      '&:hover img': { transform: 'scale(1.04)' },
                    }}
                  >
                    <Box
                      component="img"
                      src={url}
                      alt={`${gift.title}-${index + 1}`}
                      sx={{
                        width: 1,
                        aspectRatio: '1/1',
                        objectFit: 'cover',
                        transition: (theme) =>
                          theme.transitions.create('transform', {
                            duration: theme.transitions.duration.shorter,
                          }),
                      }}
                    />
                    <CardContent sx={{ py: 1.25 }}>
                      <Typography variant="subtitle2" noWrap>
                        {gift.title}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </Container>

      <Lightbox slides={slides} open={lightbox.open} close={lightbox.onClose} index={lightbox.selected} />
    </Box>
  );
}
