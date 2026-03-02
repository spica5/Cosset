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
import { useRouter } from 'src/routes/hooks';
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

export function UniverseLandingDrawer({ items = [], loading = false, sx, ...other }: Props) {
  const router = useRouter();

  return (
    <Card
      id="drawer-section"
      component="section"
      sx={{ pb: 10, overflow: 'hidden', pt: { xs: 3, md: 6 }, ...sx }}
      {...other}
    >
      <Container>
        <Stack spacing={2} sx={{ textAlign: { xs: 'center', md: 'unset' } }}>
          <Typography variant="h2">Drawer</Typography>
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
                        router.push(item.href);
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
                        <Stack direction="row" spacing={1} alignItems="center">
                          {item.icon ? (
                            <Iconify icon={item.icon} width={50} sx={{ color: 'primary.main' }} />
                          ) : null}                         
                        </Stack>
                        <Typography variant="subtitle1">{item.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.count} item{item.count === 1 ? '' : 's'} shared
                        </Typography>
                        {item.href ? (
                          <Link
                            component={RouterLink}
                            href={item.href}
                            onClick={(event) => event.stopPropagation()}
                            underline="none"
                            sx={{ typography: 'body2', color: 'primary.main' }}
                          >
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
