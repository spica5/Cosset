'use client';

import type { RefObject } from 'react';
import type { BookshelfEbookFileType } from 'src/types/bookshelf-ebook';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { fDateTime } from 'src/utils/format-time';

import {
  addBookshelfEbookBookmark,
  addBookshelfEbookReadingComment,
  deleteBookshelfEbookBookmark,
  deleteBookshelfEbookReadingComment,
  useGetBookshelfEbookBookmarks,
  useGetBookshelfEbookReadingComments,
} from 'src/actions/bookshelf-ebook-reading';

import { Iconify } from 'src/components/dashboard/iconify';
import { CommentInput } from 'src/components/universe/comment-section';

// ----------------------------------------------------------------------

type Props = {
  bookId: number;
  customerId: string;
  fileType: BookshelfEbookFileType;
  currentPage: number;
  onCurrentPageChange: (page: number) => void;
  onJumpToPage?: (page: number) => void;
  onJumpToScrollPosition?: (position: number) => void;
  txtScrollRef?: RefObject<HTMLDivElement | null>;
};

const formatPositionLabel = (
  fileType: BookshelfEbookFileType,
  pageNumber?: number | null,
  scrollPosition?: number | null,
) => {
  if (fileType === 'pdf' && pageNumber) {
    return `Page ${pageNumber}`;
  }

  if (fileType === 'txt' && scrollPosition != null) {
    return `${scrollPosition}% through text`;
  }

  return 'Current position';
};

export function BookshelfEbookReaderPanel({
  bookId,
  customerId,
  fileType,
  currentPage,
  onCurrentPageChange,
  onJumpToPage,
  onJumpToScrollPosition,
  txtScrollRef,
}: Props) {
  const [tab, setTab] = useState<'bookmarks' | 'comments'>('bookmarks');
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [deletingBookmarkId, setDeletingBookmarkId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const commitPageInput = useCallback(() => {
    const next = Math.max(1, Number.parseInt(pageInput, 10) || 1);
    setPageInput(String(next));
    onCurrentPageChange(next);
    onJumpToPage?.(next);
  }, [onCurrentPageChange, onJumpToPage, pageInput]);

  const handleStepPage = useCallback(
    (delta: number) => {
      const next = Math.max(1, currentPage + delta);
      setPageInput(String(next));
      onCurrentPageChange(next);
      onJumpToPage?.(next);
    },
    [currentPage, onCurrentPageChange, onJumpToPage],
  );

  const { bookmarks, bookmarksLoading, refreshBookmarks } = useGetBookshelfEbookBookmarks(
    bookId,
    customerId,
  );
  const { comments, commentsLoading, refreshComments } = useGetBookshelfEbookReadingComments(
    bookId,
    customerId,
  );

  const getCurrentScrollPosition = useCallback((): number | null => {
    const container = txtScrollRef?.current;
    if (!container || fileType !== 'txt') {
      return null;
    }

    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) {
      return 0;
    }

    return Math.round((container.scrollTop / maxScroll) * 100);
  }, [fileType, txtScrollRef]);

  const handleAddBookmark = async () => {
    try {
      setSavingBookmark(true);
      await addBookshelfEbookBookmark({
        bookId,
        customerId,
        pageNumber: fileType === 'pdf' ? currentPage : null,
        scrollPosition: fileType === 'txt' ? getCurrentScrollPosition() : null,
        label: bookmarkLabel.trim() || null,
      });
      setBookmarkLabel('');
      await refreshBookmarks();
    } catch (error) {
      console.error('Failed to add bookmark', error);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: number) => {
    try {
      setDeletingBookmarkId(bookmarkId);
      await deleteBookshelfEbookBookmark({ bookmarkId, bookId, customerId });
      await refreshBookmarks();
    } catch (error) {
      console.error('Failed to delete bookmark', error);
    } finally {
      setDeletingBookmarkId(null);
    }
  };

  const handleAddComment = async () => {
    const normalized = commentInput.trim();
    if (!normalized) {
      return;
    }

    try {
      setSavingComment(true);
      await addBookshelfEbookReadingComment({
        bookId,
        customerId,
        comment: normalized,
        pageNumber: fileType === 'pdf' ? currentPage : null,
        scrollPosition: fileType === 'txt' ? getCurrentScrollPosition() : null,
      });
      setCommentInput('');
      await refreshComments();
    } catch (error) {
      console.error('Failed to add reading comment', error);
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      setDeletingCommentId(commentId);
      await deleteBookshelfEbookReadingComment({ commentId, bookId, customerId });
      await refreshComments();
    } catch (error) {
      console.error('Failed to delete reading comment', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleJumpToBookmark = (pageNumber?: number | null, scrollPosition?: number | null) => {
    if (fileType === 'pdf' && pageNumber) {
      setPageInput(String(pageNumber));
      onCurrentPageChange(pageNumber);
      onJumpToPage?.(pageNumber);
      return;
    }

    if (fileType === 'txt' && scrollPosition != null) {
      onJumpToScrollPosition?.(scrollPosition);
    }
  };

  return (
    <Box
      sx={{
        width: { xs: 1, md: 320 },
        flexShrink: 0,
        borderLeft: { md: '1px solid' },
        borderColor: { md: 'divider' },
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        maxHeight: { xs: 360, md: 'none' },
      }}
    >
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          {fileType === 'pdf' ? (
            <>
              <IconButton
                size="small"
                aria-label="Previous page"
                onClick={() => handleStepPage(-1)}
                disabled={currentPage <= 1}
              >
                <Iconify icon="eva:arrow-ios-back-fill" width={18} />
              </IconButton>
              <TextField
                size="small"
                type="number"
                label="Page"
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitPageInput();
                  }
                }}
                inputProps={{ min: 1 }}
                sx={{ width: 100 }}
              />
              <IconButton
                size="small"
                aria-label="Next page"
                onClick={() => handleStepPage(1)}
              >
                <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
              </IconButton>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Scroll position is saved automatically for bookmarks and comments.
            </Typography>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:bookmark-bold" />}
            onClick={handleAddBookmark}
            disabled={savingBookmark}
            sx={{ ml: 'auto', flexShrink: 0 }}
          >
            Bookmark
          </Button>
        </Stack>

        {fileType === 'pdf' ? (
          <TextField
            size="small"
            fullWidth
            placeholder="Bookmark label (optional)"
            value={bookmarkLabel}
            onChange={(event) => setBookmarkLabel(event.target.value)}
            sx={{ mb: 1 }}
          />
        ) : null}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="fullWidth"
        sx={{ minHeight: 40, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="bookmarks" label={`Bookmarks (${bookmarks.length})`} sx={{ minHeight: 40 }} />
        <Tab value="comments" label={`Comments (${comments.length})`} sx={{ minHeight: 40 }} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {tab === 'bookmarks' ? (
          bookmarksLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading bookmarks…
            </Typography>
          ) : bookmarks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No bookmarks yet. Set your page and tap Bookmark while reading.
            </Typography>
          ) : (
            <Stack spacing={1.25} divider={<Divider flexItem />}>
              {bookmarks.map((bookmark) => (
                <Stack key={bookmark.id} direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Button
                      size="small"
                      onClick={() =>
                        handleJumpToBookmark(bookmark.pageNumber, bookmark.scrollPosition)
                      }
                      sx={{
                        p: 0,
                        minWidth: 0,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        fontWeight: 700,
                        textTransform: 'none',
                      }}
                    >
                      {bookmark.label?.trim() ||
                        formatPositionLabel(fileType, bookmark.pageNumber, bookmark.scrollPosition)}
                    </Button>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatPositionLabel(fileType, bookmark.pageNumber, bookmark.scrollPosition)}
                      {bookmark.createdAt ? ` · ${fDateTime(bookmark.createdAt)}` : ''}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    disabled={deletingBookmarkId === bookmark.id}
                    aria-label="Delete bookmark"
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )
        ) : (
          <Stack spacing={2}>
            <CommentInput
              value={commentInput}
              onChange={setCommentInput}
              onSubmit={handleAddComment}
              submitting={savingComment}
              placeholder="Add a reading comment at this position…"
            />

            {commentsLoading ? (
              <Typography variant="body2" color="text.secondary">
                Loading comments…
              </Typography>
            ) : comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No reading comments yet.
              </Typography>
            ) : (
              <Stack spacing={1.5} divider={<Divider flexItem />}>
                {comments.map((item) => (
                  <Box key={item.id}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {formatPositionLabel(fileType, item.pageNumber, item.scrollPosition)}
                        {item.createdAt ? ` · ${fDateTime(item.createdAt)}` : ''}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteComment(item.id)}
                        disabled={deletingCommentId === item.id}
                        aria-label="Delete comment"
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {item.comment}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleJumpToBookmark(item.pageNumber, item.scrollPosition)}
                      sx={{ mt: 0.5, px: 0, minWidth: 0 }}
                    >
                      Go to position
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
