'use client';

import type { IBookshelfIntroduceBook } from 'src/types/bookshelf-introduce-book';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

type Props = {
  book: IBookshelfIntroduceBook;
  canManage?: boolean;
  onEdit?: (book: IBookshelfIntroduceBook) => void;
  onDelete?: (book: IBookshelfIntroduceBook) => void;
};

const resolveCoverImage = async (coverImage?: string | null) => {
  const normalized = (coverImage || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  return (await getS3SignedUrl(normalized)) || normalized;
};

export function BookshelfIntroduceBookCard({ book, canManage, onEdit, onDelete }: Props) {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadCover = async () => {
      const resolved = await resolveCoverImage(book.coverImage);

      if (mounted) {
        setCoverUrl(resolved);
      }
    };

    loadCover();

    return () => {
      mounted = false;
    };
  }, [book.coverImage]);

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
          pt: '140%',
          position: 'relative',
          bgcolor: 'background.neutral',
        }}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={book.title}
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
            <Iconify icon="solar:book-2-bold" width={40} />
          </Stack>
        )}

        {canManage ? (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <IconButton
              size="small"
              color="default"
              onClick={() => onEdit?.(book)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="solar:pen-bold" width={18} />
            </IconButton>

            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete?.(book)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </Stack>
        ) : null}
      </Box>

      <Stack spacing={1} sx={{ p: 2, flexGrow: 1 }}>
        <Typography variant="subtitle1" sx={{ minHeight: 48 }}>
          {book.title}
        </Typography>

        {book.description ? (
          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
            {book.description}
          </Typography>
        ) : null}

        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Link
            href={book.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            Read book
            <Iconify icon="eva:external-link-fill" width={16} />
          </Link>
        </Box>
      </Stack>
    </Card>
  );
}
