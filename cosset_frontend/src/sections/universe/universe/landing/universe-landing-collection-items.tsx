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

import { useGetCollectionItems } from 'src/actions/collection-item';
import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  customerId: string;
  collections: ICollectionItem[];
};

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

  const publicItems = useMemo(
    () => collectionItems.filter((item) => item.isPublic === 1),
    [collectionItems],
  );

  const previewItems = publicItems.slice(0, 3);

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card sx={{ height: 1 }}>
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

export function UniverseLandingCollectionItems({ customerId, collections, sx, ...other }: Props) {
  return (
    <Card
      id="collection-items-section"
      component="section"
      sx={{ pb: 4, overflow: 'hidden', pt: { xs: 3, md: 6 }, ...sx }}
      {...other}
    >
      <Container>
        <Stack spacing={2} sx={{ textAlign: { xs: 'center', md: 'unset' } }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon="solar:widget-4-bold" width={26} sx={{ color: 'primary.main' }} />
            <Typography variant="h2">Collection Items ({collections.length})</Typography>
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
