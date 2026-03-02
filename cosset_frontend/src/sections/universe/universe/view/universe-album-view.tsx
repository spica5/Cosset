'use client';

import type { Slide } from 'yet-another-react-lightbox';
import type { IAlbumItem, IAlbumImage } from 'src/types/album';

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

import { getS3SignedUrl } from 'src/utils/helper';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/universe/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';

// ----------------------------------------------------------------------

type Props = {
  albumId: string;
};

export function UniverseAlbumView({ albumId }: Props) {
  const [album, setAlbum] = useState<IAlbumItem | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [images, setImages] = useState<Array<IAlbumImage & { signedUrl?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const slides: Slide[] = useMemo(
    () =>
      images
        .filter((image) => !!image.signedUrl)
        .map((image) => ({
          src: image.signedUrl!,
          alt: image.imageTitle || 'Album image',
          description:
            image.imageTitle && image.description
              ? `${image.imageTitle}: ${image.description}`
              : image.imageTitle || image.description || undefined,
        })),
    [images]
  );

  const lightbox = useLightBox(slides);

  const customerViewHref = album?.userId ? paths.universe.view(String(album.userId)) : paths.home;

  useEffect(() => {
    let mounted = true;

    const loadAlbumAndImages = async () => {
      try {
        setLoading(true);

        const [albumRes, imagesRes] = await Promise.all([
          axiosInstance.get(endpoints.album.details(albumId)),
          axiosInstance.get(endpoints.album.images.list(albumId)),
        ]);

        const fetchedAlbum = (albumRes.data?.album ?? null) as IAlbumItem | null;
        const fetchedImages = (imagesRes.data?.images ?? []) as IAlbumImage[];

        let signedCover = '';
        if (fetchedAlbum?.coverUrl) {
          if (fetchedAlbum.coverUrl.startsWith('http://') || fetchedAlbum.coverUrl.startsWith('https://')) {
            signedCover = fetchedAlbum.coverUrl;
          } else {
            signedCover = await getS3SignedUrl(fetchedAlbum.coverUrl);
          }
        }

        const imagesWithSignedUrls = await Promise.all(
          fetchedImages.map(async (image) => {
            const fileKey = image.fileUrl || '';
            if (!fileKey) return { ...image, signedUrl: '' };

            if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
              return { ...image, signedUrl: fileKey };
            }

            const signedUrl = await getS3SignedUrl(fileKey);
            return { ...image, signedUrl: signedUrl || '' };
          })
        );

        if (!mounted) return;

        setAlbum(fetchedAlbum);
        setCoverUrl(signedCover);
        setImages(imagesWithSignedUrls);
      } catch (error) {
        console.error('Failed to load universe album view data:', error);
        if (mounted) {
          setAlbum(null);
          setCoverUrl('');
          setImages([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAlbumAndImages();

    return () => {
      mounted = false;
    };
  }, [albumId]);

  const totalImages = useMemo(() => images.length, [images.length]);

  if (loading) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading album...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!album) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h4">Album not found</Typography>
          <Typography color="text.secondary">This album is unavailable or has been removed.</Typography>
          <Link component={RouterLink} href={customerViewHref} underline="none" sx={{ color: 'primary.main' }}>
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
            <Typography variant="h2">{album.title}</Typography>
            <Typography variant="body1" color="text.secondary">
              {album.description || 'No description'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {album.category || 'Uncategorized'} • {totalImages} image{totalImages === 1 ? '' : 's'}
            </Typography>
          </Stack>

          {coverUrl ? (
            <Card sx={{ overflow: 'hidden', borderRadius: 2 }}>
              <Box
                component="img"
                src={coverUrl}
                alt={album.title}
                sx={{ width: 1, height: { xs: 220, md: 420 }, objectFit: 'cover' }}
              />
            </Card>
          ) : null}

          {images.length === 0 ? (
            <Typography color="text.secondary">No images in this album.</Typography>
          ) : (
            <Grid container spacing={2}>
              {images.map((image, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
                  <Card
                    onClick={() => {
                      if (image.signedUrl) {
                        lightbox.setSelected(index);
                      }
                    }}
                    sx={{
                      cursor: image.signedUrl ? 'pointer' : 'default',
                      overflow: 'hidden',
                      borderRadius: 1.5,
                      '&:hover img': { transform: 'scale(1.04)' },
                    }}
                  >
                    <Box
                      component="img"
                      src={image.signedUrl || ''}
                      alt={image.imageTitle || 'Album image'}
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
                    {(image.imageTitle || image.description) && (
                      <CardContent sx={{ py: 1.25 }}>
                        <Typography variant="subtitle2" noWrap>
                          {image.imageTitle || 'Untitled'}
                        </Typography>
                        {image.description && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {image.description}
                          </Typography>
                        )}
                      </CardContent>
                    )}
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
