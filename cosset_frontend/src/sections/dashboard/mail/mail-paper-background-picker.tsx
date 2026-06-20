'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { varAlpha } from 'src/theme/dashboard/styles';
import { isUserAdmin } from 'src/auth/utils/role';
import { useAuthContext } from 'src/auth/hooks';
import {
  deleteMailBackground,
  resolveMailBackgroundUrls,
  useGetMailBackgrounds,
} from 'src/actions/mail-background';
import { toast } from 'src/components/dashboard/snackbar';

import { Iconify } from 'src/components/dashboard/iconify';
import { useMailPaperBackgroundUpload } from './use-mail-paper-background-upload';
import { useMailPaperBackgroundUrl, primeMailPaperBackgroundUrl } from './use-mail-paper-background-url';

// ----------------------------------------------------------------------

type ContentProps = {
  selectedImageKey?: string | null;
  onSelect: (imageKey: string | null) => void;
  disabled?: boolean;
  enabled?: boolean;
  closeOnSelect?: boolean;
  onClose?: () => void;
};

export function MailPaperBackgroundPickerContent({
  selectedImageKey,
  onSelect,
  disabled,
  enabled = true,
  closeOnSelect = false,
  onClose,
}: ContentProps) {
  const { user } = useAuthContext();
  const canManage = isUserAdmin(user?.role);

  const { backgrounds, backgroundsLoading, mutateBackgrounds } = useGetMailBackgrounds(enabled);
  const [resolvedBackgrounds, setResolvedBackgrounds] = useState<
    Awaited<ReturnType<typeof resolveMailBackgroundUrls>>
  >([]);
  const [resolving, setResolving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedPreviewUrl = useMailPaperBackgroundUrl(selectedImageKey);

  const { uploading, openFilePicker, inputRef, handleFileChange } = useMailPaperBackgroundUpload({
    disabled: disabled || !canManage,
    onCreated: async (imageKey) => {
      await mutateBackgrounds();
      onSelect(imageKey);
      if (closeOnSelect) {
        onClose?.();
      }
    },
  });

  useEffect(() => {
    if (!enabled || backgroundsLoading) {
      return undefined;
    }

    let cancelled = false;
    setResolving(true);

    resolveMailBackgroundUrls(backgrounds)
      .then((items) => {
        if (!cancelled) {
          setResolvedBackgrounds(items);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setResolving(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [backgrounds, backgroundsLoading, enabled]);

  const handleSelect = (imageKey: string | null, previewUrl?: string | null) => {
    if (imageKey && previewUrl) {
      primeMailPaperBackgroundUrl(imageKey, previewUrl);
    }
    onSelect(imageKey);
    if (closeOnSelect) {
      onClose?.();
    }
  };

  const handleDelete = async (id: string, imageKey: string) => {
    setDeletingId(id);

    try {
      await deleteMailBackground(id);
      await mutateBackgrounds();
      if (selectedImageKey === imageKey) {
        onSelect(null);
      }
      toast.success('Background image removed.');
    } catch {
      toast.error('Could not remove background image.');
    } finally {
      setDeletingId(null);
    }
  };

  const loading = backgroundsLoading || resolving;

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Background image
      </Typography>

      <ButtonBase
        onClick={() => handleSelect(null)}
        sx={{
          width: 1,
          height: 72,
          mb: 1.5,
          borderRadius: 1,
          overflow: 'hidden',
          border: (theme) =>
            !selectedImageKey
              ? `2px solid ${theme.vars.palette.primary.main}`
              : `dashed 1px ${theme.vars.palette.divider}`,
          bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
        }}
      >
        <Stack alignItems="center" spacing={0.5}>
          <Iconify icon="mingcute:close-line" width={20} sx={{ color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            No background
          </Typography>
        </Stack>
      </ButtonBase>

      {selectedPreviewUrl ? (
        <Box
          sx={{
            width: 1,
            height: 72,
            mb: 1.5,
            borderRadius: 1,
            overflow: 'hidden',
            border: (theme) => `solid 1px ${theme.vars.palette.divider}`,
          }}
        >
          <Box
            component="img"
            src={selectedPreviewUrl}
            alt="Selected background"
            sx={{ width: 1, height: 1, objectFit: 'cover' }}
          />
        </Box>
      ) : null}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={24} />
        </Stack>
      ) : resolvedBackgrounds.length ? (
        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ mb: 1.5 }}>
          {resolvedBackgrounds.map((background) => {
            const selected = selectedImageKey === background.imageKey;
            const isDeleting = deletingId === background.id;

            return (
              <Box key={background.id} sx={{ position: 'relative' }}>
                <ButtonBase
                  aria-label={background.title || 'Background image'}
                  aria-pressed={selected}
                  disabled={disabled || isDeleting}
                  onClick={() => handleSelect(background.imageKey, background.url)}
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: (theme) =>
                      selected
                        ? `2px solid ${theme.vars.palette.primary.main}`
                        : `1px solid ${theme.vars.palette.divider}`,
                  }}
                >
                  {background.url ? (
                    <Box
                      component="img"
                      src={background.url}
                      alt={background.title || 'Background'}
                      sx={{ width: 1, height: 1, objectFit: 'cover' }}
                    />
                  ) : (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      sx={{
                        width: 1,
                        height: 1,
                        bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.12),
                      }}
                    >
                      <Iconify icon="solar:gallery-bold" width={20} sx={{ color: 'text.disabled' }} />
                    </Stack>
                  )}
                </ButtonBase>

                {canManage ? (
                  <ButtonBase
                    aria-label="Delete background"
                    disabled={isDeleting}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(background.id, background.imageKey);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      color: 'common.white',
                      bgcolor: 'rgba(0,0,0,0.55)',
                    }}
                  >
                    {isDeleting ? (
                      <CircularProgress size={12} color="inherit" />
                    ) : (
                      <Iconify icon="mingcute:close-line" width={14} />
                    )}
                  </ButtonBase>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {canManage
            ? 'No backgrounds yet. Upload images for users to choose from.'
            : 'No background images are available yet.'}
        </Typography>
      )}

      <Stack direction="row" spacing={1}>
        {canManage ? (
          <Button
            fullWidth
            size="small"
            variant="contained"
            disabled={disabled || uploading}
            onClick={openFilePicker}
            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {uploading ? 'Uploading...' : 'Add background'}
          </Button>
        ) : null}

        {selectedImageKey ? (
          <Button
            fullWidth
            size="small"
            color="inherit"
            variant="outlined"
            disabled={disabled}
            onClick={() => handleSelect(null)}
          >
            Clear
          </Button>
        ) : null}
      </Stack>
    </>
  );
}

// ----------------------------------------------------------------------

type MenuProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  selectedImageKey?: string | null;
  onSelect: (imageKey: string | null) => void;
  disabled?: boolean;
};

export function MailPaperBackgroundPickerMenu({
  anchorEl,
  open,
  onClose,
  selectedImageKey,
  onSelect,
  disabled,
}: MenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { mt: 0.5, p: 1.5, width: 320, maxWidth: '92vw' },
        },
      }}
    >
      <MailPaperBackgroundPickerContent
        selectedImageKey={selectedImageKey}
        onSelect={onSelect}
        disabled={disabled}
        enabled={open}
        closeOnSelect
        onClose={onClose}
      />
    </Menu>
  );
}
