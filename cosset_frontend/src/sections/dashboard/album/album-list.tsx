import type { IAlbumItem } from 'src/types/album';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';
import { deleteAlbum } from 'src/actions/album';

import { toast } from 'src/components/dashboard/snackbar';

import { AlbumItem } from './album-item';


// ----------------------------------------------------------------------

type Props = {
  albums: IAlbumItem[];
};

export function AlbumList({ albums }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { user } = useAuthContext();

  const albumsPerPage = 8;

  const handleView = useCallback(
    (id?: number) => {
      if (!id) return;
       router.push(paths.dashboard.album.details(id));
    },
    [router]
  );

  const handleDeleteRequest = useCallback((id?: number) => {
    if (!id) return;
    setPendingDeleteId(id);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteAlbum(pendingDeleteId, user?.id);
      toast.success('Album deleted successfully!');
      setPendingDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete album');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) setPendingDeleteId(null);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

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
            onDelete={() => handleDeleteRequest(album.id)}
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

      <Dialog open={pendingDeleteId !== null} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Album</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this album? This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
