import type { IGiftItem } from 'src/types/gift';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { toast } from 'src/components/dashboard/snackbar';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { deleteGift } from 'src/actions/gift';
import { useAuthContext } from 'src/auth/hooks';

import { GiftItem } from './gift-item';

// ----------------------------------------------------------------------

type Props = {
  gifts: IGiftItem[];
};

export function GiftList({ gifts }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const giftsPerPage = 8;

  const handleView = useCallback(
    (id?: number) => {
      if (!id) return;
       router.push(paths.dashboard.drawer.gift.edit(id));
    },
    [router]
  );

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const onDeleteRequest = useCallback((id: number) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  }, []);

  const { user } = useAuthContext();

  const handleDelete = useCallback(async () => {
    if (deleteTargetId == null) return;
    try {
      await deleteGift(deleteTargetId, user?.id);
      const msg = 'Gift deleted successfully.';
      toast.success(msg);
    } catch (error) {
      console.error('Failed to delete gift:', error);
      const msg = 'Failed to delete gift.';
      toast.error(msg);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, user]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  // Calculate paginated gifts based on the current page
  const paginatedGifts = gifts.slice(
    (currentPage - 1) * giftsPerPage,
    currentPage * giftsPerPage
  );

  const totalPages = Math.ceil(gifts.length / giftsPerPage);

  if (gifts.length === 0) {
    return <p>No gifts available.</p>;
  };

  return (
    <>
      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
      >
        {gifts.map((gift, idx) => (
           <GiftItem
                key={gift.id || `gift-${idx}-${String(gift.title ?? '').slice(0, 20)}`}
                gift={gift}
                onView={() => handleView(gift.id)}
                onDelete={() => onDeleteRequest(gift.id)}
            />
        ))}
      </Box>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Gift</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this gift? This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

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
