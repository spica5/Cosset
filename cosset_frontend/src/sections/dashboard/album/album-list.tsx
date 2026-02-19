import type { IAlbumItem } from 'src/types/album';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { AlbumItem } from './album-item';


// ----------------------------------------------------------------------

type Props = {
  albums: IAlbumItem[];
};

export function AlbumList({ albums }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const albumsPerPage = 8;

  const handleView = useCallback(
    (id?: number) => {
      if (!id) return;
       router.push(paths.dashboard.album.details(id));
    },
    [router]
  );

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  // Calculate paginated albums based on the current page
  const paginatedAlbums = albums.slice(
    (currentPage - 1) * albumsPerPage,
    currentPage * albumsPerPage
  );

  const totalPages = Math.ceil(albums.length / albumsPerPage);

  if (albums.length === 0) {
    return <p>No albums available.</p>;
  };

 

  return (
    <>
      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
      >
        {albums.map((album, idx) => (
          <AlbumItem
            key={album.id || `album-${idx}-${String(album.title ?? '').slice(0, 20)}`}
            album={album}
            onView={() => handleView(album.id)}
          />
        ))}
      </Box>

      {totalPages > 1  && (
        <Pagination
          count={totalPages} 
          page={currentPage}
          onChange={handlePageChange}
          sx={{
            mt: { xs: 5, md: 8 },
            [`& .${paginationClasses.ul}`]: { justifyContent: 'center' },
          }}
        />
      )}
    </>
  );
}
