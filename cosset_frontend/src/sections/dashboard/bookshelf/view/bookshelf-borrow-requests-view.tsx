'use client';

import type { IBookshelfBorrow } from 'src/types/bookshelf-borrow';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import {
  getBookshelfBookPageHref,
  respondBookshelfBorrow,
  splitBookshelfBorrows,
  useGetBookshelfBorrows,
} from 'src/actions/bookshelf-borrow';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { resolveEbookAssetUrl } from '../bookshelf-ebook-utils';
import { resolveAudiobookAssetUrl } from '../bookshelf-audiobook-utils';
import {
  BOOKSHELF_BORROW_PERIOD_DAYS,
  formatBorrowExpiryDate,
} from '../bookshelf-borrow-config';

// ----------------------------------------------------------------------

const formatDate = (value?: string | Date | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString();
};

const getStatusColor = (status: IBookshelfBorrow['status']) => {
  if (status === 'approved') {
    return 'success';
  }

  if (status === 'pending') {
    return 'warning';
  }

  if (status === 'rejected' || status === 'expired') {
    return 'error';
  }

  return 'default';
};

const getStatusLabel = (status: IBookshelfBorrow['status']) => {
  if (status === 'approved') {
    return 'Active';
  }

  if (status === 'expired') {
    return 'Expired';
  }

  return status;
};

function BorrowCover({ borrow }: { borrow: IBookshelfBorrow }) {
  const [coverUrl, setCoverUrl] = useState('');
  const title = (borrow.bookTitle || '').trim() || 'Book cover';
  const fallbackIcon =
    borrow.bookKind === 'audiobook'
      ? 'solar:headphones-round-bold'
      : borrow.bookFileType === 'txt'
        ? 'solar:document-text-bold'
        : 'solar:book-2-bold';

  useEffect(() => {
    let mounted = true;
    const resolveCover =
      borrow.bookKind === 'audiobook' ? resolveAudiobookAssetUrl : resolveEbookAssetUrl;

    resolveCover(borrow.bookCoverImage).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [borrow.bookCoverImage, borrow.bookKind]);

  return (
    <Box
      sx={{
        width: 72,
        height: 96,
        flexShrink: 0,
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: 'background.neutral',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {coverUrl ? (
        <Box
          component="img"
          src={coverUrl}
          alt={title}
          sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1, color: 'text.disabled' }}>
          <Iconify icon={fallbackIcon} width={28} />
        </Stack>
      )}
    </Box>
  );
}

type BorrowRequestRowProps = {
  borrow: IBookshelfBorrow;
  mode: 'incoming' | 'outgoing';
  viewerCustomerId?: string;
  actingId: number | null;
  showCover?: boolean;
  onRespond?: (borrow: IBookshelfBorrow, status: 'approved' | 'rejected' | 'cancelled') => void;
  onReturn?: (borrow: IBookshelfBorrow) => void;
};

function BorrowRequestRow({
  borrow,
  mode,
  viewerCustomerId,
  actingId,
  showCover = false,
  onRespond,
  onReturn,
}: BorrowRequestRowProps) {
  const isActing = actingId === borrow.id;
  const bookKindLabel = borrow.bookKind === 'audiobook' ? 'Audiobook' : 'E-book';
  const title = (borrow.bookTitle || '').trim() || `${bookKindLabel} #${borrow.bookId}`;
  const bookHref = getBookshelfBookPageHref(borrow, viewerCustomerId);
  const respondedAt = borrow.respondedAt || borrow.requestedAt;
  const isReturning = actingId === borrow.id;
  const canReturn = borrow.status === 'approved' && !!onReturn;

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
          {showCover ? <BorrowCover borrow={borrow} /> : null}

          <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1">{title}</Typography>
            <Chip size="small" label={bookKindLabel} />
            <Chip size="small" color={getStatusColor(borrow.status)} label={getStatusLabel(borrow.status)} />
          </Stack>

          {borrow.bookAuthor ? (
            <Typography variant="body2" color="text.secondary">
              by {borrow.bookAuthor}
            </Typography>
          ) : null}

          <Typography variant="caption" color="text.secondary">
            {mode === 'incoming'
              ? `Requested by ${borrow.counterpartyName || 'a neighbor'}`
              : `From ${borrow.counterpartyName || 'owner'}`}{' '}
            · Requested {formatDate(borrow.requestedAt)}
            {borrow.status !== 'pending' ? ` · Updated ${formatDate(respondedAt)}` : ''}
            {borrow.borrowPeriodDays
              ? ` · Borrow period: ${borrow.borrowPeriodDays} days`
              : ''}
            {borrow.status === 'approved' && borrow.expiresAt
              ? ` · Expires ${formatBorrowExpiryDate(borrow.expiresAt)}`
              : ''}
            {borrow.status === 'expired' && borrow.expiresAt
              ? ` · Expired ${formatBorrowExpiryDate(borrow.expiresAt)}`
              : ''}
          </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {bookHref ? (
            <Button
              component={RouterLink}
              href={bookHref}
              size="small"
              variant="contained"
              startIcon={
                <Iconify
                  icon={borrow.bookKind === 'audiobook' ? 'solar:play-circle-bold' : 'solar:book-2-bold'}
                  width={18}
                />
              }
            >
              {borrow.bookKind === 'audiobook' ? 'Open audiobook' : 'Open book'}
            </Button>
          ) : null}

          {canReturn ? (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={isReturning}
              startIcon={<Iconify icon="solar:undo-left-round-bold" width={18} />}
              onClick={() => onReturn?.(borrow)}
            >
              {isReturning
                ? 'Returning...'
                : mode === 'incoming'
                  ? 'Mark returned'
                  : 'Return book'}
            </Button>
          ) : null}

          {borrow.status === 'pending' && onRespond ? (
            mode === 'incoming' ? (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={isActing}
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  onClick={() => onRespond(borrow, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={isActing}
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  onClick={() => onRespond(borrow, 'rejected')}
                >
                  Decline
                </Button>
              </>
            ) : (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                disabled={isActing}
                onClick={() => onRespond(borrow, 'cancelled')}
              >
                Cancel request
              </Button>
            )
          ) : null}
        </Stack>
      </Stack>
    </Card>
  );
}

type BorrowSectionProps = {
  title: string;
  description?: string;
  borrows: IBookshelfBorrow[];
  emptyTitle: string;
  emptyDescription: string;
  mode: 'incoming' | 'outgoing';
  viewerCustomerId?: string;
  actingId: number | null;
  showCover?: boolean;
  onRespond?: (borrow: IBookshelfBorrow, status: 'approved' | 'rejected' | 'cancelled') => void;
  onReturn?: (borrow: IBookshelfBorrow) => void;
};

function BorrowSection({
  title,
  description,
  borrows,
  emptyTitle,
  emptyDescription,
  mode,
  viewerCustomerId,
  actingId,
  showCover = false,
  onRespond,
  onReturn,
}: BorrowSectionProps) {
  if (!borrows.length) {
    return (
      <Card variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        ) : null}
        <EmptyContent title={emptyTitle} description={emptyDescription} sx={{ py: 6 }} />
      </Card>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.5}>
        <Typography variant="h6">{title}</Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Stack>

      {borrows.map((borrow) => (
        <BorrowRequestRow
          key={borrow.id}
          borrow={borrow}
          mode={mode}
          viewerCustomerId={viewerCustomerId}
          actingId={actingId}
          showCover={showCover}
          onRespond={onRespond}
          onReturn={onReturn}
        />
      ))}
    </Stack>
  );
}

export function BookshelfBorrowRequestsView() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [actingId, setActingId] = useState<number | null>(null);

  const { borrows: incomingBorrows, borrowsLoading: incomingLoading } = useGetBookshelfBorrows(
    user?.id,
    'owner',
    'all',
  );

  const { borrows: outgoingBorrows, borrowsLoading: outgoingLoading } = useGetBookshelfBorrows(
    user?.id,
    'borrower',
    'all',
  );

  const incomingGroups = useMemo(() => splitBookshelfBorrows(incomingBorrows), [incomingBorrows]);
  const outgoingGroups = useMemo(() => splitBookshelfBorrows(outgoingBorrows), [outgoingBorrows]);

  const activeGroups = tab === 'incoming' ? incomingGroups : outgoingGroups;
  const loading = tab === 'incoming' ? incomingLoading : outgoingLoading;
  const hasAnyRecords =
    activeGroups.pending.length + activeGroups.active.length + activeGroups.history.length > 0;

  const handleRespond = useCallback(
    async (borrow: IBookshelfBorrow, status: 'approved' | 'rejected' | 'cancelled') => {
      if (!user?.id) {
        return;
      }

      try {
        setActingId(borrow.id);
        await respondBookshelfBorrow(borrow.id, user.id, status);

        if (status === 'approved') {
          toast.success('Borrow request approved.');
        } else if (status === 'rejected') {
          toast.success('Borrow request declined.');
        } else {
          toast.success('Borrow request cancelled.');
        }
      } catch (error) {
        console.error('Failed to update borrow request:', error);
        toast.error('Failed to update borrow request.');
      } finally {
        setActingId(null);
      }
    },
    [user?.id],
  );

  const handleReturn = useCallback(
    async (borrow: IBookshelfBorrow) => {
      if (!user?.id) {
        return;
      }

      const title = (borrow.bookTitle || '').trim() || 'this book';
      const confirmed = window.confirm(`Return "${title}"?`);
      if (!confirmed) {
        return;
      }

      try {
        setActingId(borrow.id);
        await respondBookshelfBorrow(borrow.id, user.id, 'returned');
        toast.success('Book marked as returned.');
      } catch (error) {
        console.error('Failed to return borrowed book:', error);
        toast.error('Failed to return book.');
      } finally {
        setActingId(null);
      }
    },
    [user?.id],
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Borrow requests"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookshelf', href: paths.dashboard.bookshelf.root },
          { name: 'Borrow requests' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Manage book lending
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Approve requests from neighbors who want to borrow your public books. Approved borrows
            last {BOOKSHELF_BORROW_PERIOD_DAYS} days, then return automatically. Your full borrow
            history stays here.
          </Typography>

          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 2 }}>
            <Tab
              value="incoming"
              label={`Requests to me (${incomingGroups.pending.length})`}
              icon={<Iconify icon="solar:inbox-in-bold" width={18} />}
              iconPosition="start"
            />
            <Tab
              value="outgoing"
              label={`My requests (${outgoingGroups.pending.length})`}
              icon={<Iconify icon="solar:export-bold" width={18} />}
              iconPosition="start"
            />
          </Tabs>
        </Card>

        {loading ? (
          <Card sx={{ p: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <Iconify icon="solar:refresh-outline" width={18} />
              <Typography variant="body2" color="text.secondary">
                Loading borrow requests...
              </Typography>
            </Stack>
          </Card>
        ) : !hasAnyRecords ? (
          <EmptyContent
            title={tab === 'incoming' ? 'No incoming borrow activity yet' : 'No outgoing borrow activity yet'}
            description={
              tab === 'incoming'
                ? 'When someone requests to borrow your public book, it will show up here.'
                : 'Request to borrow a book from a neighbor’s My Space bookshelf.'
            }
            filled
            sx={{ py: 10 }}
          />
        ) : (
          <Stack spacing={3}>
            {activeGroups.pending.length > 0 ? (
              <BorrowSection
                title="Pending requests"
                borrows={activeGroups.pending}
                emptyTitle="No pending requests"
                emptyDescription={
                  tab === 'incoming'
                    ? 'New borrow requests will appear here.'
                    : 'Your waiting borrow requests will appear here.'
                }
                mode={tab}
                viewerCustomerId={user?.id}
                actingId={actingId}
                onRespond={handleRespond}
              />
            ) : null}

            {activeGroups.active.length > 0 ? (
              <BorrowSection
                title="Currently borrowed"
                description="Active borrows you can open on your bookshelf."
                borrows={activeGroups.active}
                emptyTitle="No active borrows"
                emptyDescription={
                  tab === 'incoming'
                    ? 'Books you have lent out will appear here while they are active.'
                    : 'Books you are currently borrowing will appear here.'
                }
                mode={tab}
                viewerCustomerId={user?.id}
                actingId={actingId}
                showCover
                onReturn={handleReturn}
              />
            ) : null}

            {activeGroups.history.length > 0 ? (
              <BorrowSection
                title="History"
                description="Declined, cancelled, returned, and expired borrow requests."
                borrows={activeGroups.history}
                emptyTitle="No borrow history yet"
                emptyDescription="Completed borrow requests will be kept here for reference."
                mode={tab}
                viewerCustomerId={user?.id}
                actingId={actingId}
              />
            ) : null}
          </Stack>
        )}
      </Stack>
    </DashboardContent>
  );
}
