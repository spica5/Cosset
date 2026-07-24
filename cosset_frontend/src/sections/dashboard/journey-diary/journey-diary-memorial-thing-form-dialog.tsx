'use client';

import type { ChangeEvent } from 'react';
import type { IJourneyMemorialThing, JourneyMemorialThingCategory } from 'src/types/journey-diary-memorial-thing';

import { useRef } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { isVideoFile, isVideoMediaPath, isImageOrVideoFile, IMAGE_VIDEO_ACCEPT } from 'src/utils/media-file';

import { Iconify } from 'src/components/dashboard/iconify';

import { MEMORIAL_THING_CATEGORIES } from './memorial-things-categories';

import type { JourneyTimelineEntry } from './my-journey-utils';

// ----------------------------------------------------------------------

export type MemorialThingFormValues = {
  category: JourneyMemorialThingCategory;
  title: string;
  description: string;
  memorialDate: string;
};

export type MemorialThingImageDraft = {
  clientId: string;
  imageKey?: string;
  previewUrl: string;
  file?: File;
};

type Props = {
  open: boolean;
  saving?: boolean;
  uploadingImage?: boolean;
  editingItem: IJourneyMemorialThing | null;
  selectedEntry: JourneyTimelineEntry | null;
  formImages: MemorialThingImageDraft[];
  values: MemorialThingFormValues;
  onChange: (field: keyof MemorialThingFormValues, value: string) => void;
  onImagesSelect: (files: File[]) => void;
  onRemoveImage: (clientId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const JOURNEY_CONTENT_BORDER = '1px solid rgba(31, 42, 68, 0.16)';

export function JourneyDiaryMemorialThingFormDialog({
  open,
  saving = false,
  uploadingImage = false,
  editingItem,
  selectedEntry,
  formImages,
  values,
  onChange,
  onImagesSelect,
  onRemoveImage,
  onClose,
  onSubmit,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!files.length) {
      return;
    }

    const mediaFiles = files.filter((file) => isImageOrVideoFile(file));

    if (mediaFiles.length) {
      onImagesSelect(mediaFiles);
    }
  };

  const busy = saving || uploadingImage;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{editingItem ? 'Update memorial thing' : 'Add memorial thing'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            select
            fullWidth
            label="Category"
            value={values.category}
            onChange={(event) => onChange('category', event.target.value)}
          >
            {MEMORIAL_THING_CATEGORIES.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Title"
              value={values.title}
              onChange={(event) => onChange('title', event.target.value)}
            />

            <TextField
              fullWidth
              label="Date"
              type="date"
              value={values.memorialDate}
              onChange={(event) => onChange('memorialDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Description"
            value={values.description}
            onChange={(event) => onChange('description', event.target.value)}
            helperText={
              selectedEntry
                ? `Saving to ${selectedEntry.country} (${selectedEntry.monthLabel} ${selectedEntry.year})`
                : 'Select a journey on the left first.'
            }
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Upload images or videos
            </Typography>

            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_VIDEO_ACCEPT}
              multiple
              hidden
              onChange={handleFileChange}
            />

            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:upload-bold" />}
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              Choose files
            </Button>

            {formImages.length ? (
              <Box
                sx={{
                  mt: 1.5,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 1.25,
                }}
              >
                {formImages.map((image) => {
                  const isVideo =
                    (image.file ? isVideoFile(image.file) : false) ||
                    isVideoMediaPath(image.imageKey || image.previewUrl);

                  return (
                  <Box
                    key={image.clientId}
                    sx={{
                      position: 'relative',
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      border: JOURNEY_CONTENT_BORDER,
                    }}
                  >
                    {isVideo ? (
                      <Box
                        component="video"
                        src={image.previewUrl}
                        muted
                        playsInline
                        preload="metadata"
                        sx={{
                          width: 1,
                          height: 120,
                          objectFit: 'cover',
                          display: 'block',
                          bgcolor: 'common.black',
                        }}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={image.previewUrl}
                        alt="Memorial thing preview"
                        sx={{
                          width: 1,
                          height: 120,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    )}
                    <IconButton
                      size="small"
                      onClick={() => onRemoveImage(image.clientId)}
                      disabled={busy}
                      sx={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        bgcolor: 'rgba(255,255,255,0.92)',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'common.white' },
                      }}
                      aria-label="Remove media"
                    >
                      <Iconify icon="mingcute:close-line" width={16} />
                    </IconButton>
                  </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Upload one or more photos or videos for this memorial item.
              </Typography>
            )}

            {uploadingImage ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Uploading media...
                </Typography>
              </Stack>
            ) : null}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={busy || !values.title.trim() || !selectedEntry}
        >
          {editingItem ? 'Save changes' : 'Add item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
