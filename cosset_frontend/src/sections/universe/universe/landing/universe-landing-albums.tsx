import type { BoxProps } from '@mui/material/Box';
import type { IAlbumItem } from 'src/types/album';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardMedia from '@mui/material/CardMedia';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  albums: (IAlbumItem & { signedCoverUrl?: string })[];
  albumsLoading?: boolean;
};

export function UniverseLandingAlbums({
  albums,
  albumsLoading = false,
  sx,
  ...other
}: Props) {
  return (
    <Card
      id="albums-section"
      component="section"
      sx={{
        pb: 3,
        overflow: 'hidden',
        pt: { xs: 3, md: 6 },
        ...sx,
      }}
      {...other}
    >
      <Container>
        <Stack spacing={2} sx={{ textAlign: { xs: 'center', md: 'unset' } }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Iconify icon="solar:album-bold" width={36} sx={{ color: 'primary.main' }} />
            <Typography variant="h2">Albums ({albums.length})</Typography>
          </Stack>
        </Stack>

        <Box sx={{ py: { xs: 4, md: 6 } }}>
          {albumsLoading ? (
            <Typography color="text.secondary">Loading albums...</Typography>
          ) : albums.length === 0 ? (
            <Typography color="text.secondary">No shared albums found.</Typography>
          ) : (
            <Grid container spacing={2}>
              {albums.map((album) => {
                const albumHref = paths.universe.album(album.id);

                return (
                  <Grid item xs={12} sm={6} md={3} key={album.id}>
                    <Card
                      onClick={() => window.open(albumHref, '_blank', 'noopener,noreferrer')}
                      sx={{
                        cursor: 'pointer',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: (theme) => theme.shadows[8],
                        },
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="180"
                        image={album.signedCoverUrl || ''}
                        alt={album.title}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent>
                        <Stack spacing={1}>
                          <Typography variant="h6" noWrap>
                            {album.title}
                          </Typography>

                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Iconify icon="solar:gallery-bold" width={14} sx={{ color: 'info.main' }} />
                            <Typography variant="caption" color="text.secondary">
                              Shared album item
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={0.75} alignItems="flex-start">
                            <Iconify
                              icon="solar:notes-linear"
                              width={14}
                              sx={{ color: 'text.secondary', mt: '2px', flexShrink: 0 }}
                            />
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {album.description || 'No description'}
                            </Typography>
                          </Stack>

                          <Typography
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              typography: 'body2',
                              color: 'primary.main',
                              textDecoration: 'none',
                            }}
                          >
                            <Iconify icon="eva:arrow-ios-forward-fill" width={14} />
                            View album
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>

        {/* <Stack direction="row" justifyContent={{ xs: 'center', md: 'flex-end' }}>
          <Typography
            component={RouterLink}
            href={paths.universe.albums}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              typography: 'button',
              color: 'text.primary',
              textDecoration: 'none',
            }}
          >
            View all
            <Iconify icon="solar:alt-arrow-right-outline" />
          </Typography>
        </Stack> */}
      </Container>
    </Card>
  );
}
