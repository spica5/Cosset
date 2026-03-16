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

import { Label } from 'src/components/universe/label';
import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  albums: (IAlbumItem & { signedCoverUrl?: string })[];
  albumsLoading?: boolean;
};

const SECTION_TITLE_FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

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
          <Stack spacing={0.75}>
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                px: 1.5,
                py: 0.8,
                borderRadius: 99,
                border: '1px solid rgba(27, 153, 139, 0.35)',
                background: 'linear-gradient(90deg, rgba(27, 153, 139, 0.16), rgba(27, 153, 139, 0.05))',
                boxShadow: '0 8px 18px rgba(27, 153, 139, 0.14)',
                width: 'fit-content',
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(27, 153, 139, 0.35)',
                  bgcolor: 'rgba(255,255,255,0.35)',
                }}
              >
                <Iconify icon="solar:album-bold" width={24} sx={{ color: 'primary.main' }} />
              </Box>

              <Typography
                variant="h2"
                sx={{
                  fontFamily: SECTION_TITLE_FONT,
                  fontWeight: 800,
                  letterSpacing: '0.01em',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                >
                  Albums
                  <Label
                    color="error"
                    variant="filled"
                    sx={{
                      top: 0,
                      left: '100%',
                      px: 0.5,
                      height: 24,
                      position: 'absolute',
                      transform: 'translate(-10%, -45%)',
                      borderRadius: '50%',
                    }}
                  >
                    {albums.length}
                  </Label>
                </Box>
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontFamily: SECTION_TITLE_FONT, letterSpacing: '0.01em' }}
            >
              Memory frames and snapshots shared with visitors
            </Typography>
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
      </Container>
    </Card>
  );
}
