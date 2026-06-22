'use client';

import type { BoxProps } from '@mui/material/Box';
import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import InputAdornment from '@mui/material/InputAdornment';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/universe/iconify';

import { getEbookFileTypeLabel, resolveEbookAssetUrl } from 'src/sections/dashboard/bookshelf/bookshelf-ebook-utils';
import {
  getAudiobookFileTypeLabel,
  resolveAudiobookAssetUrl,
} from 'src/sections/dashboard/bookshelf/bookshelf-audiobook-utils';

import { MySpaceSectionTitle } from './myspace-section-title';
import { myspaceItemCardSx, myspaceItemGridSx } from './myspace-item-layout';

// ----------------------------------------------------------------------

type BookshelfItem =
  | { kind: 'ebook'; item: IBookshelfEbook }
  | { kind: 'audiobook'; item: IBookshelfAudiobook };

type Props = BoxProps & {
  ebooks: IBookshelfEbook[];
  audiobooks: IBookshelfAudiobook[];
  showEbooks?: boolean;
  showAudiobooks?: boolean;
  loading?: boolean;
  isOwner?: boolean;
};

const PAGE_SIZE = 6;

const SECTION_SERIF = '"Georgia", "Times New Roman", "Palatino Linotype", serif';

const CARD_BG = '#FAF6F0';

const ACCENT_PINK = '#E8A0A8';

const formatBookDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
};

const getExcerpt = (description?: string | null) => {
  const source = (description || '').trim();
  if (!source) {
    return 'No description yet.';
  }

  return source.length > 72 ? `${source.slice(0, 72)}...` : source;
};

type BookCardProps = {
  entry: BookshelfItem;
};

function BookshelfCover({ entry }: BookCardProps) {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    const coverImage = entry.item.coverImage;
    const resolveCover =
      entry.kind === 'audiobook' ? resolveAudiobookAssetUrl : resolveEbookAssetUrl;

    resolveCover(coverImage).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [entry]);

  const title = entry.item.title;
  const fallbackIcon =
    entry.kind === 'audiobook'
      ? 'solar:headphones-round-bold'
      : entry.item.fileType === 'txt'
        ? 'solar:document-text-bold'
        : 'solar:book-2-bold';

  return (
    <Box sx={{ position: 'relative', px: 1.5, pt: 1.5 }}>
      <Box
        sx={{
          position: 'relative',
          minHeight: 210,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(139, 119, 101, 0.14)',
          bgcolor: 'grey.200',
        }}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={title}
            sx={{
              width: 1,
              height: 240,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: 210, color: 'text.disabled' }}
          >
            <Iconify icon={fallbackIcon} width={40} />
          </Stack>
        )}

        <Chip
          label={entry.kind === 'ebook' ? 'E-book' : 'Audio-book'}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontWeight: 700,
            bgcolor: 'rgba(255,255,255,0.92)',
          }}
        />
      </Box>
    </Box>
  );
}

function UniverseLandingBookshelfCard({ entry }: BookCardProps) {
  const title = (entry.item.title || '').trim() || `Book #${entry.item.id}`;
  const fileTypeLabel =
    entry.kind === 'ebook'
      ? getEbookFileTypeLabel(entry.item.fileType)
      : getAudiobookFileTypeLabel(entry.item.fileType);

  const handleOpen = async () => {
    const resolver = entry.kind === 'ebook' ? resolveEbookAssetUrl : resolveAudiobookAssetUrl;
    const url = await resolver(entry.item.fileUrl);

    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const cardBody = (
    <>
      <BookshelfCover entry={entry} />

      <Stack spacing={0.75} sx={{ p: 2, pt: 1.5, flex: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: SECTION_SERIF,
            fontWeight: 700,
            fontSize: '1.05rem',
            lineHeight: 1.35,
            minWidth: 0,
          }}
        >
          {title}
        </Typography>

        {entry.item.author ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            by {entry.item.author}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Iconify icon="solar:calendar-minimalistic-bold" width={14} sx={{ color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            {formatBookDate(entry.item.createdAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            · {fileTypeLabel}
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
            flex: 1,
          }}
        >
          {getExcerpt(entry.item.description)}
        </Typography>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: ACCENT_PINK, fontWeight: 700 }}>
            <Iconify
              icon={entry.kind === 'audiobook' ? 'solar:play-circle-bold' : 'solar:eye-bold'}
              width={18}
            />
            <Typography variant="body2" fontWeight={700}>
              {entry.kind === 'audiobook' ? 'Listen' : 'Read'}
            </Typography>
          </Stack>

          <Iconify icon="solar:book-2-bold-duotone" width={22} sx={{ color: ACCENT_PINK, opacity: 0.75 }} />
        </Stack>
      </Stack>
    </>
  );

  return (
    <Card
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: CARD_BG,
        boxShadow: '0 4px 18px rgba(60, 45, 30, 0.08)',
        border: '1px solid rgba(139, 119, 101, 0.12)',
        transition: (theme) =>
          theme.transitions.create(['transform', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 10px 28px rgba(60, 45, 30, 0.12)',
        },
      }}
    >
      <CardActionArea
        onClick={handleOpen}
        sx={{ height: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        {cardBody}
      </CardActionArea>
    </Card>
  );
}

export function UniverseLandingBookshelf({
  ebooks,
  audiobooks,
  showEbooks = false,
  showAudiobooks = false,
  loading = false,
  isOwner = false,
  sx,
  ...other
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const bookshelfItems = useMemo<BookshelfItem[]>(() => {
    const entries: BookshelfItem[] = [];

    if (showEbooks) {
      ebooks.forEach((item) => entries.push({ kind: 'ebook', item }));
    }

    if (showAudiobooks) {
      audiobooks.forEach((item) => entries.push({ kind: 'audiobook', item }));
    }

    return entries;
  }, [audiobooks, ebooks, showAudiobooks, showEbooks]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return bookshelfItems;
    }

    return bookshelfItems.filter(({ item, kind }) => {
      const searchable = [
        item.title,
        item.author,
        item.description,
        kind === 'ebook' ? 'e-book' : 'audio-book',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [bookshelfItems, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page, pageCount]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  return (
    <Box
      id="bookshelf-section"
      component="section"
      sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, ...sx }}
      {...other}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
        >
          <Stack spacing={1} sx={{ maxWidth: 520 }}>
            <MySpaceSectionTitle
              title="BOOKSHELF"
              subtitle="E-books and audiobooks shared from the bookshelf."
              itemCount={bookshelfItems.length}
            />
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: 1, md: 'auto' } }}
          >
            <TextField
              size="small"
              placeholder="Search bookshelf..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              sx={{
                minWidth: { sm: 240 },
                bgcolor: 'background.paper',
                borderRadius: 99,
                '& .MuiOutlinedInput-root': { borderRadius: 99 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            {isOwner ? (
              <Button
                component={RouterLink}
                href={paths.dashboard.bookshelf.root}
                variant="contained"
                startIcon={<Iconify icon="solar:book-2-bold" />}
                sx={{
                  borderRadius: 99,
                  px: 2.5,
                  whiteSpace: 'nowrap',
                  bgcolor: ACCENT_PINK,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#d88e96', boxShadow: 'none' },
                }}
              >
                Manage Bookshelf
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {loading ? (
          <Typography color="text.secondary">Loading bookshelf...</Typography>
        ) : filteredItems.length === 0 ? (
          <Typography color="text.secondary">
            {searchQuery.trim() ? 'No bookshelf items match your search.' : 'No shared bookshelf items found.'}
          </Typography>
        ) : (
          <>
            <Box sx={myspaceItemGridSx}>
              {paginatedItems.map((entry) => (
                <Box
                  key={`${entry.kind}-${entry.item.id}`}
                  sx={myspaceItemCardSx}
                >
                  <UniverseLandingBookshelfCard entry={entry} />
                </Box>
              ))}
            </Box>

            {pageCount > 1 ? (
              <Stack alignItems="center" sx={{ pt: 1 }}>
                <Pagination
                  count={pageCount}
                  page={Math.min(page, pageCount)}
                  onChange={(_, value) => setPage(value)}
                  shape="rounded"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 600,
                    },
                    '& .Mui-selected': {
                      bgcolor: `${ACCENT_PINK} !important`,
                      color: 'common.white',
                    },
                  }}
                />
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </Box>
  );
}
