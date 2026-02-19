import type { INeighborItem } from 'src/types/neighbor';

import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { NeighborItem } from './neighbor-item';

// ----------------------------------------------------------------------

type Props = {
  neighbors: INeighborItem[];
};

export function NeighborList({ neighbors }: Props) {
  const router = useRouter();

  const handleView = useCallback(
    (id: string) => {
      router.push(paths.dashboard.community.neighbor.details(id));
    },
    [router]
  );

  return (
    <>
      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
      >
        {neighbors.map((neighbor) => (
          <NeighborItem
            key={neighbor.id}
            neighbor={neighbor}
            onView={() => handleView(neighbor.id)}
          />
        ))}
      </Box>

      {neighbors.length > 8 && (
        <Pagination
          count={8}
          sx={{
            mt: { xs: 5, md: 8 },
            [`& .${paginationClasses.ul}`]: { justifyContent: 'center' },
          }}
        />
      )}
    </>
  );
}
