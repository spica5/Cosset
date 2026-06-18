'use client';

import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/dashboard/iconify';

import { getAudiobookFileTypeLabel, resolveAudiobookAssetUrl } from './bookshelf-audiobook-utils';

// ----------------------------------------------------------------------

type Props = {
  audiobook: IBookshelfAudiobook;
  canManage?: boolean;
  onListen?: (audiobook: IBookshelfAudiobook) => void;
  onEdit?: (audiobook: IBookshelfAudiobook) => void;
  onDelete?: (audiobook: IBookshelfAudiobook) => void;
};

export function BookshelfAudiobookCard({
  audiobook,
  canManage,
  onListen,
  onEdit,
  onDelete,
}: Props) {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    resolveAudiobookAssetUrl(audiobook.coverImage).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [audiobook.coverImage]);

  return (
    <Card
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          pt: '100%',
          position: 'relative',
          bgcolor: 'background.neutral',
          cursor: 'pointer',
        }}
        onClick={() => onListen?.(audiobook)}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={audiobook.title}
            sx={{
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              position: 'absolute',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              position: 'absolute',
              color: 'text.disabled',
            }}
          >
            <Iconify icon="solar:headphones-round-bold" width={44} />
          </Stack>
        )}

        <Chip
          label={getAudiobookFileTypeLabel(audiobook.fileType)}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontWeight: 700,
          }}
        />

        {canManage ? (
          <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(audiobook);
              }}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="solar:pen-bold" width={18} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(audiobook);
              }}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </Stack>
        ) : null}
      </Box>

      <Stack spacing={1} sx={{ p: 2, flexGrow: 1 }}>
        <Typography variant="subtitle1" sx={{ minHeight: 48 }}>
          {audiobook.title}
        </Typography>

        {audiobook.author ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            by {audiobook.author}
          </Typography>
        ) : null}

        {audiobook.description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40,
            }}
          >
            {audiobook.description}
          </Typography>
        ) : null}

        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<Iconify icon="solar:play-circle-bold" />}
            onClick={() => onListen?.(audiobook)}
            fullWidth
          >
            Listen
          </Button>
        </Box>
      </Stack>
    </Card>
  );
}
