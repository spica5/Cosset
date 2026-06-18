'use client';

import type { IBookshelfIntroduce } from 'src/types/bookshelf-introduce';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/dashboard/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import {
  SHELF_COUNT,
  getBookAuthorLabel,
  getBookDescriptionLabel,
  splitBooksIntoShelves,
  filterIntroduceBooks,
  resolveIntroduceCoverUrl,
} from './bookshelf-introduce-utils';

// ----------------------------------------------------------------------

const WOOD_FRAME_SX = {
  borderRadius: 1,
  border: '10px solid #4a2f23',
  background: 'linear-gradient(180deg, #6b442f 0%, #4a2f23 48%, #3b2419 100%)',
  boxShadow: '0 24px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
};

const SHELF_BOARD_SX = {
  height: 14,
  borderRadius: '2px',
  background: 'linear-gradient(180deg, #8b5e3c 0%, #5c3b28 100%)',
  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.12), 0 4px 8px rgba(0,0,0,0.25)',
};

const PARCHMENT_SX = {
  bgcolor: '#f3e4c8',
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at top right, rgba(255,255,255,0.45), transparent 55%)',
};

// ----------------------------------------------------------------------

type BookDetailPanelProps = {
  book: IBookshelfIntroduce | null;
  canManage?: boolean;
  onEdit?: (book: IBookshelfIntroduce) => void;
  onDelete?: (book: IBookshelfIntroduce) => void;
};

function BookDetailPanel({ book, canManage, onEdit, onDelete }: BookDetailPanelProps) {
  const [coverUrl, setCoverUrl] = useState('');

  const coverSlides = useMemo(
    () => (coverUrl ? [{ src: coverUrl, title: book?.title || 'Book cover' }] : []),
    [book?.title, coverUrl],
  );

  const lightbox = useLightBox(coverSlides);

  useEffect(() => {
    let mounted = true;

    if (!book?.coverImage) {
      setCoverUrl('');
      return () => {
        mounted = false;
      };
    }

    resolveIntroduceCoverUrl(book.coverImage).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [book?.coverImage, book?.id]);

  if (!book) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ flex: 1, minHeight: 280, px: 2, py: 4, textAlign: 'center' }}
      >
        <Iconify icon="solar:book-2-bold" width={48} sx={{ color: 'rgba(74,47,35,0.35)' }} />
        <Typography variant="subtitle1" sx={{ color: '#4a2f23', fontWeight: 700 }}>
          Select a book
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(74,47,35,0.7)', maxWidth: 220 }}>
          Click a cover on the shelf to view its details here.
        </Typography>
      </Stack>
    );
  }

  const author = getBookAuthorLabel(book);
  const description = getBookDescriptionLabel(book);

  return (
    <Stack
      spacing={2}
      sx={{
        flex: 2,
        minHeight: 200,
        px: { xs: 2, md: 2.5 },
        py: { xs: 2, md: 2.5 },
        overflow: 'auto',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="center"
      >
        <Box
          onClick={() => {
            if (coverUrl) {
              lightbox.onOpen(coverUrl);
            }
          }}
          sx={{
            width: '65%',
            maxWidth: 250,
            mx: 'auto',
            pt: '80%',
            position: 'relative',
            borderRadius: 1,
            overflow: 'hidden',
            border: '2px solid rgba(74,47,35,0.18)',
            boxShadow: '0 12px 28px rgba(74,47,35,0.22)',
            bgcolor: '#d7c4a4',
            cursor: coverUrl ? 'zoom-in' : 'default',
            '&:hover .cover-preview-hint': {
              opacity: coverUrl ? 1 : 0,
            },
          }}
        >
          {coverUrl ? (
            <Box
              component="img"
              src={coverUrl}
              alt={book.title}
              sx={{
                position: 'absolute',
                inset: 0,
                width: 1,
                height: 1,
                objectFit: 'cover',
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                position: 'absolute',
                inset: 0,
                color: 'rgba(74,47,35,0.55)',
              }}
            >
              <Iconify icon="solar:book-2-bold" width={56} />
            </Stack>
          )}

          {coverUrl ? (
            <Stack
              className="cover-preview-hint"
              alignItems="center"
              justifyContent="center"
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                transition: 'opacity 0.2s ease',
                bgcolor: 'rgba(0,0,0,0.28)',
                color: 'common.white',
              }}
            >
              <Iconify icon="solar:maximize-square-bold" width={28} />
            </Stack>
          ) : null}
        </Box>

        <Box
          sx={{
            width: '30%',
            maxWidth: 250,
            mx: 'auto',
            position: 'relative',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
        {canManage ? (
            <Stack direction="column" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:pen-bold" width={16} />}
                onClick={() => onEdit?.(book)}
                sx={{
                  color: '#4a2f23',
                  borderColor: 'rgba(74,47,35,0.35)',
                }}
              >
                Edit
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                onClick={() => onDelete?.(book)}
              >
                Delete
              </Button>
            </Stack>
          ) : null}
        </Box>
      </Stack>

      <Stack spacing={1} sx={{ textAlign: 'center' }}>
        <Typography
          variant="h6"
          sx={{
            color: '#2d1a12',
            fontWeight: 800,
            lineHeight: 1.35,
          }}
        >
          {book.title}
        </Typography>

        {author ? (
          <Typography variant="body2" sx={{ color: '#5c4030', fontWeight: 600 }}>
            by {author}
          </Typography>
        ) : null}

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(45,26,18,0.78)',
              lineHeight: 1.7,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              minHeight: '150px',
              overflow: 'auto',
            }}
          >
            {description ? `Description: ${description}` : 'No description available'}
          </Typography>

      </Stack>

      <Stack spacing={1.25} alignItems="center">
        <Button
          component={Link}
          href={book.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          startIcon={<Iconify icon="solar:book-2-bold" width={18} />}
          sx={{
            px: 2.5,
            py: 1,
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: '#2d1a12',
            color: 'common.white',
            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
            '&:hover': {
              bgcolor: '#1f120d',
            },
          }}
        >
          Read book
        </Button>

      </Stack>

      <Lightbox
        slides={coverSlides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />
    </Stack>
  );
}

// ----------------------------------------------------------------------

type BookCoverProps = {
  book: IBookshelfIntroduce;
  active?: boolean;
  canManage?: boolean;
  onSelect?: (book: IBookshelfIntroduce) => void;
  onEdit?: (book: IBookshelfIntroduce) => void;
  onDelete?: (book: IBookshelfIntroduce) => void;
};

function BookCover({ book, active, canManage, onSelect, onEdit, onDelete }: BookCoverProps) {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    resolveIntroduceCoverUrl(book.coverImage).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [book.coverImage]);

  return (
    <Box
      onClick={() => onSelect?.(book)}
      sx={{
        position: 'relative',
        width: { xs: 52, sm: 64, md: 96 },
        flexShrink: 0,
        cursor: 'pointer',
        transform: active ? 'translateY(-6px) scale(1.04)' : 'none',
        transition: 'transform 0.2s ease',
      }}
    >
      <Box
        sx={{
          pt: '140%',
          borderRadius: 0.5,
          position: 'relative',
          overflow: 'hidden',
          border: active ? '2px solid #f6d58d' : '1px solid rgba(0,0,0,0.25)',
          boxShadow: active
            ? '0 10px 18px rgba(0,0,0,0.35)'
            : '0 6px 12px rgba(0,0,0,0.28)',
          bgcolor: '#d7c4a4',
        }}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={book.title}
            sx={{
              position: 'absolute',
              inset: 0,
              width: 1,
              height: 1,
              objectFit: 'cover',
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              position: 'absolute',
              inset: 0,
              color: 'rgba(74,47,35,0.55)',
            }}
          >
            <Iconify icon="solar:book-2-bold" width={28} />
          </Stack>
        )}
      </Box>

      {canManage ? (
        <Stack direction="row" spacing={0.25} sx={{ position: 'absolute', top: -8, right: -8 }}>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.(book);
            }}
            sx={{
              width: 22,
              height: 22,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <Iconify icon="solar:pen-bold" width={14} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(book);
            }}
            sx={{
              width: 22,
              height: 22,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={14} />
          </IconButton>
        </Stack>
      ) : null}
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  books: IBookshelfIntroduce[];
  booksLoading?: boolean;
  canManage?: boolean;
  onAdd?: () => void;
  onEdit?: (book: IBookshelfIntroduce) => void;
  onDelete?: (book: IBookshelfIntroduce) => void;
};

export function BookshelfIntroduceFeatured({
  books,
  booksLoading,
  canManage,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBookId, setActiveBookId] = useState<number | null>(null);

  const filteredBooks = useMemo(
    () => filterIntroduceBooks(books, searchQuery),
    [books, searchQuery],
  );

  const shelves = useMemo(() => splitBooksIntoShelves(filteredBooks), [filteredBooks]);

  const numberedShelves = useMemo(() => {
    let index = 0;

    return shelves.map((shelfBooks) =>
      shelfBooks.map((book) => {
        index += 1;
        return { book, index };
      }),
    );
  }, [shelves]);

  const selectedBook = useMemo(
    () => filteredBooks.find((book) => book.id === activeBookId) ?? null,
    [activeBookId, filteredBooks],
  );

  useEffect(() => {
    if (filteredBooks.length === 0) {
      setActiveBookId(null);
      return;
    }

    const isActiveVisible = activeBookId != null && filteredBooks.some((book) => book.id === activeBookId);

    if (!isActiveVisible) {
      setActiveBookId(filteredBooks[0].id);
    }
  }, [activeBookId, filteredBooks]);

  const handleSelect = useCallback((book: IBookshelfIntroduce) => {
    setActiveBookId(book.id);
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        minHeight: { xs: 520, md: 640 },
        px: { xs: 1.5, md: 3 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${CONFIG.dashboard.assetsDir}/assets/images/design-space/universe-large-1.webp)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 15% 20%, rgba(255, 183, 77, 0.35), transparent 35%), radial-gradient(circle at 85% 25%, rgba(77, 208, 225, 0.35), transparent 32%), linear-gradient(180deg, rgba(18, 24, 38, 0.2) 0%, rgba(18, 24, 38, 0.55) 100%)',
        }}
      />

      <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '20%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.92)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon="solar:book-2-bold" width={28} sx={{ color: 'primary.main' }} />
              <Iconify
                icon="solar:star-bold"
                width={15}
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: -4,
                  color: 'warning.main',
                }}
              />
            </Box>
          </Box>

          <Box sx={{ textAlign: { xs: 'left', sm: 'left' } }}>
            <Typography
              variant="h3"
              sx={{
                color: 'common.white',
                fontWeight: 800,
                letterSpacing: 1.5,
                textShadow: '0 4px 16px rgba(0,0,0,0.35)',
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              Featured Books
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'rgba(255,255,255,0.88)',
                textShadow: '0 2px 8px rgba(0,0,0,0.35)',
              }}
            >
              Browse recommended books with cover images.
            </Typography>
          </Box>

          {canManage ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={onAdd}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                position: 'absolute',
                top: { md: 24 },
                right: { md: 24 },
              }}
            >
              Add book
            </Button>
          ) : null}
        </Stack>

        <Box sx={{ ...WOOD_FRAME_SX, p: { xs: 1.25, md: 2 } }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.5,
                minWidth: { xs: 160, sm: 220 },
                borderRadius: 1,
                bgcolor: '#e8d2a8',
                border: '1px solid rgba(74,47,35,0.18)',
              }}
            >
              <Iconify icon="eva:search-fill" width={18} sx={{ color: '#6b4a35' }} />
              <InputBase
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search books"
                sx={{
                  flex: 1,
                  fontSize: 14,
                  color: '#4a2f23',
                  '& input::placeholder': {
                    color: 'rgba(74,47,35,0.55)',
                    opacity: 1,
                  },
                }}
              />
            </Box>

            {canManage ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={onAdd}
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  color: '#f3e4c8',
                  borderColor: 'rgba(243,228,200,0.45)',
                }}
              >
                Add
              </Button>
            ) : null}
          </Stack>

          {booksLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
              <Iconify icon="solar:refresh-outline" width={24} sx={{ color: '#f3e4c8', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(243,228,200,0.85)' }}>
                Loading featured books...
              </Typography>
            </Stack>
          ) : filteredBooks.length === 0 ? (
            <EmptyContent
              title={searchQuery ? 'No books match your search' : 'No featured books yet'}
              description={
                canManage
                  ? 'Add a featured book with a cover image and reading link.'
                  : 'Check back soon for featured book recommendations.'
              }
              filled
              sx={{ py: 8, color: '#f3e4c8' }}
            />
          ) : (
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={{ xs: 1.5, lg: 0 }}
              sx={{ minHeight: 420 }}
            >
              <Box
                sx={{
                  flex: { lg: '0 0 65%' },
                  px: { xs: 0.5, md: 1 },
                  py: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                {numberedShelves.map((shelfBooks, shelfIndex) => (
                  <Box key={`shelf-visual-${shelfIndex}`} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack
                      direction="row"
                      alignItems="flex-end"
                      spacing={{ xs: 0.75, md: 1.25 }}
                      sx={{
                        flex: 1,
                        px: 0.5,
                        pb: 0.5,
                        minHeight: { xs: 90, md: 100 },
                      }}
                    >
                      {shelfBooks.map(({ book }) => (
                        <BookCover
                          key={book.id}
                          book={book}
                          active={activeBookId === book.id}
                          canManage={canManage}
                          onSelect={handleSelect}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      ))}
                    </Stack>
                    <Box sx={SHELF_BOARD_SX} />
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  flex: 1,
                  ...PARCHMENT_SX,
                  borderRadius: 1,
                  border: '1px solid rgba(74,47,35,0.12)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <BookDetailPanel
                  book={selectedBook}
                  canManage={canManage}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </Box>
            </Stack>
          )}

          <Stack alignItems="center" sx={{ pt: 2 }}>
            <Button
              component={RouterLink}
              href={paths.dashboard.bookshelf.ebooks}
              variant="contained"
              sx={{
                px: 3,
                py: 1,
                borderRadius: 10,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: 'rgba(20, 12, 8, 0.82)',
                color: 'common.white',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                '&:hover': {
                  bgcolor: 'rgba(20, 12, 8, 0.94)',
                },
              }}
            >
              View all Collections
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
