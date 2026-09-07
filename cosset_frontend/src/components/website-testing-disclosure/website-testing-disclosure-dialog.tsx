'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import type { WebsiteTestingDisclosureContentData } from 'src/content/website-testing-disclosure';

import { WebsiteTestingDisclosureContent } from './website-testing-disclosure-content';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  content?: WebsiteTestingDisclosureContentData | null;
  onAccepted: () => void;
};

export function WebsiteTestingDisclosureDialog({ open, content, onAccepted }: Props) {
  const [accepted, setAccepted] = useState(false);

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="md"
      scroll="paper"
      disableEscapeKeyDown
      onClose={() => undefined}
      aria-labelledby="website-testing-disclosure-dialog-title"
    >
      <DialogTitle
        id="website-testing-disclosure-dialog-title"
        sx={{
          px: { xs: 2.5, sm: 3.5 },
          py: 2.25,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        Before you create an account
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          px: { xs: 2.5, sm: 3.5 },
          py: { xs: 2.5, sm: 3 },
        }}
      >
        <WebsiteTestingDisclosureContent compact content={content} showUpdatedAt />

        <Box sx={{ mt: 3 }}>
          <FormControlLabel
            sx={{
              alignItems: 'flex-start',
              mx: 0,
              color: 'error.main',
              '& .MuiFormControlLabel-label': { color: 'error.main' },
            }}
            control={
              <Checkbox
                color="error"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                sx={{ pt: 0.25, color: 'error.main' }}
              />
            }
            label="I have read and understand this Website Testing Disclosure, including the risks of data loss during the testing period."
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, py: 2.25 }}>
        <Button
          color="inherit"
          variant="contained"
          disabled={!accepted}
          onClick={onAccepted}
        >
          Continue to create account
        </Button>
      </DialogActions>
    </Dialog>
  );
}
