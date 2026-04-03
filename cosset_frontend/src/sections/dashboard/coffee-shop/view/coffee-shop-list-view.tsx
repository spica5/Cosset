'use client';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useGetCoffeeShops, deleteCoffeeShop } from 'src/actions/coffee-shop';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/universe/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';
import { CoffeeShopItem } from 'src/sections/dashboard/coffee-shop/coffee-shop-item';

// ----------------------------------------------------------------------

export function CoffeeShopListView() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { coffeeShops, coffeeShopsLoading } = useGetCoffeeShops();

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return coffeeShops;
    }

    return coffeeShops.filter((item) => {
      const haystack = [
        String(item.id),
        item.name,
        item.title,
        item.description,
        String(item.type),
        item.files,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [search, coffeeShops]);

  const handleDelete = async (id: number) => {
    try {
      await deleteCoffeeShop(id);
    } catch (error) {
      console.error('Failed to delete coffee shop:', error);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Coffee Shops"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: 'Coffee Shops' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <TextField
              size="small"
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, title, type, or file"
            />

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: 1, md: 'auto' } }}>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                Showing {filteredData.length} of {coffeeShops.length}
              </Typography>

              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={() => router.push(paths.dashboard.community.coffeeShop.new)}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Add Coffee Shop
              </Button>
            </Stack>
          </Stack>

          {coffeeShopsLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <Iconify icon="solar:refresh-outline" width={16} />
              <Typography variant="body2" color="text.secondary">
                Loading coffee shops...
              </Typography>
            </Stack>
          ) : filteredData.length === 0 ? (
            <EmptyContent title="No coffee shops found" filled sx={{ py: 8 }} />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
              }}
            >
              {filteredData.map((item) => (
                <CoffeeShopItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  title={item.title}
                  description={item.description}
                  background={item.background}
                  files={item.files}
                  createdAt={item.createdAt}
                  previewHref={paths.dashboard.community.coffeeShop.view(item.id)}
                  onEdit={(id) => router.push(paths.dashboard.community.coffeeShop.edit(id))}
                  onDelete={handleDelete}
                />
              ))}
            </Box>
          )}
        </Stack>
      </Card>
    </DashboardContent>
  );
}
