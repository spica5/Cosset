import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

export type DrawerSharedItem = {
  key: string;
  label: string;
  count: number;
  href?: string;
  icon?: string;
};

type Props = BoxProps & {
  items?: DrawerSharedItem[];
  loading?: boolean;
};

const SECTION_TITLE_FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

export function UniverseLandingDrawer({ items = [], loading = false, sx, ...other }: Props) {
  return (
    <Card
      id="drawer-section"
      component="section"
      sx={{ pb: 10, overflow: 'hidden', pt: { xs: 3, md: 6 }, ...sx }}
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
                border: '1px solid rgba(199, 125, 18, 0.34)',
                background: 'linear-gradient(90deg, rgba(199, 125, 18, 0.16), rgba(199, 125, 18, 0.06))',
                boxShadow: '0 8px 18px rgba(199, 125, 18, 0.15)',
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
                  border: '1px solid rgba(199, 125, 18, 0.35)',
                  bgcolor: 'rgba(255,255,255,0.35)',
                }}
              >
                <Iconify icon="solar:box-bold" width={20} sx={{ color: 'primary.main' }} />
              </Box>

              <Typography
                variant="h2"
                sx={{
                  fontFamily: SECTION_TITLE_FONT,
                  fontWeight: 800,
                  letterSpacing: '0.01em',
                }}
              >
                Drawers
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontFamily: SECTION_TITLE_FONT, letterSpacing: '0.01em' }}
            >
              Keepsakes, mementos, and meaningful shared moments
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ py: { xs: 3, md: 6 } }}>
          {loading ? (
            <Typography color="text.secondary">Loading drawer shared items...</Typography>
          ) : items.length === 0 ? (
            <Typography color="text.secondary">No shared drawer items found.</Typography>
          ) : (
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid item xs={12} sm={6} md={3} key={item.key}>
                  <Card
                    onClick={() => {
                      if (item.href) {
                        window.open(item.href, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    sx={{
                        height: 1,
                        cursor: item.href ? 'pointer' : 'default',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.neutral',
                        '&:hover': {
                          bgcolor: 'divider',
                        },
                      }}
                  >
                    <CardContent>
                      <Stack spacing={1} alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                          {item.icon ? (
                            <Iconify icon={item.icon} width={20} sx={{ color: 'primary.main' }} />
                          ) : (
                            <Iconify icon="solar:box-minimalistic-bold" width={20} sx={{ color: 'primary.main' }} />
                          )}
                          <Typography variant="subtitle1">{item.label}</Typography>
                        </Stack>

                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Iconify icon="eva:layers-fill" width={14} sx={{ color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {item.count} item{item.count === 1 ? '' : 's'} shared
                          </Typography>
                        </Stack>

                        {item.href ? (
                          <Link
                            component={RouterLink}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            underline="none"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              typography: 'body2',
                              color: 'primary.main',
                            }}
                          >
                            <Iconify icon="eva:arrow-ios-forward-fill" width={14} />
                            View items
                          </Link>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </Card>
  );
}
