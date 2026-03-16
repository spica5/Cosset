import type { BoxProps } from '@mui/material/Box';
import type { ICollectionItem } from 'src/types/collection';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useGetCollectionItems } from 'src/actions/collection-item';

import { Label } from 'src/components/universe/label';
import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  customerId: string;
  collections: ICollectionItem[];
};

const SECTION_TITLE_FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

type CollectionCardProps = {
  customerId: string;
  collection: ICollectionItem;
};

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString();
};

function UniverseCollectionItemsCard({ customerId, collection }: CollectionCardProps) {
  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(collection.id, customerId);
  const collectionItemsHref = paths.universe.collectionItems(customerId, collection.id);

  const publicItems = useMemo(
    () => collectionItems.filter((item) => item.isPublic === 1),
    [collectionItems],
  );

  const previewItems = publicItems.slice(0, 3);

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card
        component={RouterLink}
        href={collectionItemsHref}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          height: 1,
          textDecoration: 'none',
          color: 'inherit',
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          transition: (theme) =>
            theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
              duration: theme.transitions.duration.shorter,
            }),
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: 'primary.main',
            boxShadow: (theme) => theme.shadows[8],
          },
        }}
      >
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Iconify icon="solar:folder-with-files-bold" width={16} sx={{ color: 'primary.main' }} />
              <Typography variant="h6" noWrap>
                {collection.name || `Collection #${collection.id}`}
              </Typography>
            </Stack>

            {collectionItemsLoading ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:refresh-outline" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Loading items...
                </Typography>
              </Stack>
            ) : (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="eva:layers-fill" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {publicItems.length} public item{publicItems.length === 1 ? '' : 's'}
                </Typography>
              </Stack>
            )}

            {!collectionItemsLoading && publicItems.length === 0 && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:forbidden-circle-linear" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  No public items in this collection.
                </Typography>
              </Stack>
            )}

            {!collectionItemsLoading && previewItems.length > 0 && (
              <Stack spacing={0.75}>
                {previewItems.map((item) => (
                  <Box key={item.id}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Iconify
                        icon="solar:bookmark-square-minimalistic-bold"
                        width={14}
                        sx={{ color: 'info.main' }}
                      />
                      <Typography variant="body2" noWrap>
                        {(item.title || '').trim() || `Item #${item.id}`}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Iconify icon="eva:calendar-outline" width={14} sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(item.date || item.updatedAt)}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

export function UniverseLandingCollectionItems({
  customerId,
  collections,
  sx,
  ...other
}: Props) {
  return (
    <Card
      id="collection-items-section"
      component="section"
      sx={{ pb: 4, overflow: 'hidden', pt: { xs: 3, md: 6 }, ...sx }}
      {...other}
    >
      <Container>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="flex-start"
        >
          <Stack spacing={0.75} sx={{ textAlign: { xs: 'left', md: 'unset' } }}>
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                px: 1.5,
                py: 0.8,
                borderRadius: 99,
                border: '1px solid rgba(112, 88, 210, 0.33)',
                background: 'linear-gradient(90deg, rgba(112, 88, 210, 0.16), rgba(112, 88, 210, 0.06))',
                boxShadow: '0 8px 18px rgba(112, 88, 210, 0.14)',
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
                  border: '1px solid rgba(112, 88, 210, 0.35)',
                  bgcolor: 'rgba(255,255,255,0.35)',
                }}
              >
                <Iconify icon="solar:widget-4-bold" width={24} sx={{ color: 'primary.main' }} />
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
                  Collections
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
                    {collections.length}
                  </Label>
                </Box>
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontFamily: SECTION_TITLE_FONT, letterSpacing: '0.01em' }}
            >
              Curated highlights from shared collections
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ py: { xs: 4, md: 6 } }}>
          {collections.length === 0 ? (
            <Typography color="text.secondary">No shared collections found.</Typography>
          ) : (
            <Grid container spacing={2}>
              {collections.map((collection) => (
                <UniverseCollectionItemsCard
                  key={collection.id}
                  customerId={customerId}
                  collection={collection}
                />
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </Card>
  );
}
