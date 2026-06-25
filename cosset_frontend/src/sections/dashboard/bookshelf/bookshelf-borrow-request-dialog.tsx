'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/dashboard/iconify';

import {
  BOOKSHELF_BORROW_PERIOD_DAYS,
  BOOKSHELF_BORROW_PERIOD_MAX_DAYS,
  BOOKSHELF_BORROW_PERIOD_MIN_DAYS,
  BOOKSHELF_BORROW_PERIOD_PRESETS,
  normalizeBorrowPeriodDays,
} from './bookshelf-borrow-config';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  bookTitle?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (borrowPeriodDays: number) => void;
};

export function BookshelfBorrowRequestDialog({
  open,
  bookTitle,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [periodDays, setPeriodDays] = useState(String(BOOKSHELF_BORROW_PERIOD_DAYS));

  useEffect(() => {
    if (open) {
      setPeriodDays(String(BOOKSHELF_BORROW_PERIOD_DAYS));
    }
  }, [open]);

  const normalizedPeriod = normalizeBorrowPeriodDays(periodDays);

  const handleSubmit = () => {
    onSubmit(normalizedPeriod);
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Request to borrow</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {bookTitle ? (
            <Typography variant="body2" color="text.secondary">
              Choose how long you want to borrow <strong>{bookTitle}</strong> after the owner
              approves your request.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Choose how long you want to borrow this book after the owner approves your request.
            </Typography>
          )}

          <TextField
            label="Borrow period (days)"
            type="number"
            value={periodDays}
            onChange={(event) => setPeriodDays(event.target.value)}
            inputProps={{
              min: BOOKSHELF_BORROW_PERIOD_MIN_DAYS,
              max: BOOKSHELF_BORROW_PERIOD_MAX_DAYS,
            }}
            helperText={`Between ${BOOKSHELF_BORROW_PERIOD_MIN_DAYS} and ${BOOKSHELF_BORROW_PERIOD_MAX_DAYS} days`}
            fullWidth
          />

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Quick picks
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {BOOKSHELF_BORROW_PERIOD_PRESETS.map((days) => (
                <Chip
                  key={days}
                  label={`${days} days`}
                  clickable
                  color={normalizedPeriod === days ? 'primary' : 'default'}
                  variant={normalizedPeriod === days ? 'filled' : 'outlined'}
                  onClick={() => setPeriodDays(String(days))}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={submitting}
          startIcon={<Iconify icon="solar:hand-heart-bold" width={18} />}
          onClick={handleSubmit}
        >
          {submitting ? 'Sending...' : 'Send request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
