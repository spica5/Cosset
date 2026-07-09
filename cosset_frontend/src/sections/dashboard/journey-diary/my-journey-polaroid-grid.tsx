'use client';

import { useCallback, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/dashboard/iconify';

import {
  JourneyDiaryPublicControl,
} from './journey-diary-public-toggle';
import type { JourneyPolaroidItem } from './my-journey-utils';
import type { JourneyVisibility } from './journey-diary-public-utils';

// ----------------------------------------------------------------------

type Props = {
  items: JourneyPolaroidItem[];
  uploadingIds?: Record<string, boolean>;
  addingPhoto?: boolean;
  canAdd?: boolean;
  visibilitySavingId?: string | null;
  onAddPhoto?: () => void;
  onDelete?: (pictureId: string) => void;
  onRename?: (pictureId: string, caption: string) => void | Promise<void>;
  onTogglePublic?: (pictureId: string, visibility: JourneyVisibility) => void | Promise<void>;
};

function PolaroidCard({
  item,
  uploading,
  visibilitySaving,
  onDelete,
  onRename,
  onPreview,
  onTogglePublic,
}: {
  item: JourneyPolaroidItem;
  uploading?: boolean;
  visibilitySaving?: boolean;
  onDelete?: (pictureId: string) => void;
  onRename?: (item: JourneyPolaroidItem) => void;
  onPreview?: (item: JourneyPolaroidItem) => void;
  onTogglePublic?: (pictureId: string, visibility: JourneyVisibility) => void | Promise<void>;
}) {
  const showImage = Boolean(item.imageUrl);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 1,
        maxWidth: 220,
        mx: 'auto',
        transform: `rotate(${item.rotation}deg)`,
        transition: 'transform 0.2s ease',
        '&:hover': {
          transform: `rotate(0deg) scale(1.02)`,
          zIndex: 2,
        },
        '&:hover .photo-actions': {
          opacity: 1,
        },
      }}
    >
      {item.decoration === 'tape' ? (
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%) rotate(-4deg)',
            width: 54,
            height: 18,
            bgcolor: 'rgba(214, 198, 164, 0.92)',
            border: '1px solid rgba(160, 140, 108, 0.45)',
            borderRadius: 0.5,
            zIndex: 2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
        />
      ) : null}

      {item.decoration === 'pin' ? (
        <Box
          sx={{
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: '#1F1F1F',
            zIndex: 2,
            boxShadow: '0 2px 0 rgba(0,0,0,0.25)',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 2,
              height: 8,
              bgcolor: 'rgba(0,0,0,0.35)',
            },
          }}
        />
      ) : null}

      <Box
        sx={{
          bgcolor: '#fff',
          p: 1,
          pb: 2.5,
          boxShadow: '0 10px 24px rgba(47, 35, 22, 0.14)',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: 1,
            aspectRatio: '4 / 3',
            bgcolor: 'grey.200',
            overflow: 'hidden',
          }}
        >
          {showImage ? (
            <Box
              component="img"
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              onClick={() => onPreview?.(item)}
              sx={{
                width: 1,
                height: 1,
                objectFit: 'cover',
                display: 'block',
                cursor: 'zoom-in',
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ width: 1, height: 1, px: 2, textAlign: 'center' }}
            >
              <CircularProgress size={24} />
            </Stack>
          )}

          {uploading ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(255,255,255,0.72)',
              }}
            >
              <CircularProgress size={28} />
            </Stack>
          ) : null}

          {(onDelete || onRename) && item.hasCustomImage ? (
            <Stack
              direction="row"
              spacing={0.5}
              className="photo-actions"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                opacity: 0,
                transition: 'opacity 0.2s ease',
              }}
            >
              {onRename ? (
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRename(item);
                  }}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.92)',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'common.white' },
                  }}
                  aria-label="Rename photo"
                >
                  <Iconify icon="solar:pen-bold" width={18} />
                </IconButton>
              ) : null}
              {onDelete ? (
                <IconButton
                  size="small"
                  color="error"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onDelete) {
                      onDelete(item.id);
                    }
                  }}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.92)',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'common.white' },
                  }}
                  aria-label="Delete photo"
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                </IconButton>
              ) : null}
            </Stack>
          ) : null}
        </Box>

        <Typography
          onClick={() => onRename?.(item)}
          sx={{
            mt: 1.25,
            textAlign: 'center',
            fontFamily: '"Caveat Variable", "Pacifico", cursive',
            fontSize: '1.35rem',
            color: '#1F2A44',
            lineHeight: 1.1,
            cursor: onRename ? 'text' : 'default',
            '&:hover': onRename
              ? {
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                }
              : undefined,
          }}
        >
          {item.title}
        </Typography>

        {onTogglePublic ? (
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
            <JourneyDiaryPublicControl
              isPublic={item.isPublic}
              saving={visibilitySaving}
              onChange={(visibility) => onTogglePublic(item.id, visibility)}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function AddPhotoCard({ onClick, loading }: { onClick?: () => void; loading?: boolean }) {
  return (
    <Button
      onClick={onClick}
      disabled={loading}
      sx={{
        width: 1,
        maxWidth: 220,
        mx: 'auto',
        minHeight: 0,
        p: 0,
        borderRadius: 0,
        textTransform: 'none',
      }}
    >
      <Box
        sx={{
          width: 1,
          bgcolor: '#fff',
          p: 1,
          pb: 2.5,
          boxShadow: '0 10px 24px rgba(47, 35, 22, 0.08)',
          border: '1px dashed rgba(31, 42, 68, 0.2)',
        }}
      >
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            width: 1,
            aspectRatio: '4 / 3',
            bgcolor: 'rgba(255,255,255,0.7)',
          }}
        >
          {loading ? (
            <CircularProgress size={28} />
          ) : (
            <>
              <Iconify icon="mingcute:add-line" width={32} sx={{ color: '#1F2A44', mb: 0.75 }} />
              <Typography variant="caption" sx={{ color: '#1F2A44', fontWeight: 600 }}>
                Add photo
              </Typography>
            </>
          )}
        </Stack>

        <Typography
          sx={{
            mt: 1.25,
            textAlign: 'center',
            fontFamily: '"Caveat Variable", "Pacifico", cursive',
            fontSize: '1.2rem',
            color: 'text.disabled',
          }}
        >
          New memory
        </Typography>
      </Box>
    </Button>
  );
}

export function MyJourneyPolaroidGrid({
  items,
  uploadingIds = {},
  addingPhoto = false,
  canAdd = false,
  visibilitySavingId = null,
  onAddPhoto,
  onDelete,
  onRename,
  onTogglePublic,
}: Props) {
  const [previewItem, setPreviewItem] = useState<JourneyPolaroidItem | null>(null);
  const [renameItem, setRenameItem] = useState<JourneyPolaroidItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const handleTogglePublic = useCallback(
    async (pictureId: string, visibility: JourneyVisibility) => {
      await onTogglePublic?.(pictureId, visibility);
      setPreviewItem((prev) => (prev?.id === pictureId ? { ...prev, isPublic: visibility } : prev));
    },
    [onTogglePublic],
  );

  const openRenameDialog = (item: JourneyPolaroidItem) => {
    setRenameItem(item);
    setRenameValue(item.title);
  };

  const closeRenameDialog = () => {
    if (renaming) {
      return;
    }

    setRenameItem(null);
    setRenameValue('');
  };

  const handleSaveRename = async () => {
    const trimmed = renameValue.trim();

    if (!renameItem || !onRename || !trimmed) {
      return;
    }

    setRenaming(true);

    try {
      await onRename(renameItem.id, trimmed);

      if (previewItem?.id === renameItem.id) {
        setPreviewItem((prev) => (prev ? { ...prev, title: trimmed } : null));
      }

      setRenameItem(null);
      setRenameValue('');
    } finally {
      setRenaming(false);
    }
  };

  if (!items.length && !canAdd) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          minHeight: 320,
          border: '1px dashed rgba(31, 42, 68, 0.18)',
          borderRadius: 1,
          bgcolor: 'rgba(255,255,255,0.35)',
          p: 3,
        }}
      >
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 360 }}>
          Select a journey on the timeline to view or add representative photos.
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          gap: { xs: 3, md: 3.5 },
          px: { xs: 1, md: 2 },
          py: { xs: 1, md: 2 },
        }}
      >
        {items.map((item) => (
          <PolaroidCard
            key={item.id}
            item={item}
            uploading={uploadingIds[item.id]}
            visibilitySaving={visibilitySavingId === item.id}
            onDelete={onDelete}
            onRename={onRename ? openRenameDialog : undefined}
            onPreview={setPreviewItem}
            onTogglePublic={onTogglePublic ? handleTogglePublic : undefined}
          />
        ))}

        {canAdd ? <AddPhotoCard onClick={onAddPhoto} loading={addingPhoto} /> : null}
      </Box>

      <Dialog
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh',
            m: 0,
          },
        }}
      >
        {previewItem ? (
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Box
              component="img"
              src={previewItem.imageUrl}
              alt={previewItem.title}
              onClick={() => setPreviewItem(null)}
              sx={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: 1,
                cursor: 'zoom-out',
              }}
            />
            <IconButton
              onClick={() => setPreviewItem(null)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'common.white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              }}
            >
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
            {onRename ? (
              <IconButton
                onClick={() => openRenameDialog(previewItem)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 48,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'common.white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
                aria-label="Rename photo"
              >
                <Iconify icon="solar:pen-bold" width={18} />
              </IconButton>
            ) : null}
            <Typography
              sx={{
                position: 'absolute',
                left: 16,
                bottom: 16,
                color: 'common.white',
                fontFamily: '"Caveat Variable", "Pacifico", cursive',
                fontSize: '1.5rem',
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              {previewItem.title}
            </Typography>

            {onTogglePublic ? (
              <Box
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: 16,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: 'rgba(0,0,0,0.55)',
                }}
              >
                <JourneyDiaryPublicControl
                  isPublic={previewItem.isPublic}
                  saving={visibilitySavingId === previewItem.id}
                  onChange={(visibility) => handleTogglePublic(previewItem.id, visibility)}
                />
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(renameItem)} onClose={closeRenameDialog} fullWidth maxWidth="xs">
        <DialogTitle>Rename photo</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Photo name"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSaveRename();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRenameDialog} disabled={renaming}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRename}
            disabled={renaming || !renameValue.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
