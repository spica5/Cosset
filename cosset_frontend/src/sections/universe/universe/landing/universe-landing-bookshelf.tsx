'use client';

import type { BoxProps } from '@mui/material/Box';
import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfBorrow } from 'src/types/bookshelf-borrow';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import InputBase from '@mui/material/InputBase';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { hasDistinctSidebar } from 'src/utils/design-space-type';

import { Iconify } from 'src/components/universe/iconify';
import { toast } from 'src/components/dashboard/snackbar';

import {
  requestBookshelfBorrow,
  useGetBookshelfBorrowStatuses,
} from 'src/actions/bookshelf-borrow';
import { useGetBookshelfEbookReadingCounts, revalidateBookshelfEbookReadingCounts } from 'src/actions/bookshelf-ebook-reading';

import { isBookFavorite } from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

import { MYSPACE_SECTION_SERIF } from './myspace-section-title';
import { useDesignSpaceTheme } from './design-space-theme-context';
import {
  getMyspaceBookshelfDecorImageUrl,
  getMyspaceBookshelfDecorImageFallbackUrl,
} from './myspace-section-images';
import {
  type BookshelfNavCategory,
  type BookshelfLayoutTheme,
  BOOKSHELF_NAV_ITEMS,
  BOOKSHELF_PAGE_SIZE,
  BOOKSHELF_TITLE,
  BOOKSHELF_SUBTITLE,
  BOOKSHELF_FOOTER_QUOTE,
  BOOKSHELF_SIDEBAR_QUOTE,
  getBookshelfLayoutTheme,
  filterBookshelfByNavCategory,
  buildBookshelfShelfRows,
  getBookshelfNavCounts,
  getBookshelfReadingCountsForEntry,
} from './universe-landing-bookshelf-theme';
import {
  type BookshelfItem,
  PARCHMENT_SX,
  padShelfEntries,
  BOOKSHELF_GRID_TEMPLATE_COLUMNS,
  BOOKSHELF_GRID_TEMPLATE_COLUMNS_COMPACT,
  BookshelfBookCover,
  BookshelfBookDetailPanel,
  BookshelfBookQuotesPanel,
  BookshelfShelfSlotPlaceholder,
} from './universe-landing-bookshelf-parts';

import {
  getEntryKey,
  filterBookshelfItems,
} from './universe-landing-bookshelf-utils';
// ----------------------------------------------------------------------

type Props = BoxProps & {
  ebooks: IBookshelfEbook[];
  audiobooks: IBookshelfAudiobook[];
  showEbooks?: boolean;
  showAudiobooks?: boolean;
  loading?: boolean;
  isOwner?: boolean;
  ownerCustomerId?: string;
  viewerCustomerId?: string;
  authenticated?: boolean;
  customerName?: string;
  customerAvatarUrl?: string;
};

type BookshelfTitleAvatarProps = {
  customerName?: string;
  customerAvatarUrl?: string;
  size?: 'sidebar' | 'mobile';
};

function BookshelfTitleAvatar({
  customerName,
  customerAvatarUrl,
  size = 'sidebar',
}: BookshelfTitleAvatarProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const useSidebarPalette = hasDistinctSidebar(spaceTheme);
  const isSidebar = size === 'sidebar';
  const displayName = customerName || 'Customer';
  const dimension = isSidebar ? 40 : 36;

  return (
    <Avatar
      src={customerAvatarUrl || undefined}
      alt={displayName}
      sx={{
        width: dimension,
        height: dimension,
        border: '2px solid',
        borderColor: useSidebarPalette ? 'rgba(255, 248, 240, 0.35)' : spaceTheme.surfaceBg,
        boxShadow: spaceTheme.isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.35)'
          : '0 2px 8px rgba(60, 45, 30, 0.12)',
        flexShrink: 0,
        ...(spaceTheme.isDark || useSidebarPalette
          ? {
              bgcolor: useSidebarPalette ? 'rgba(255, 248, 240, 0.14)' : spaceTheme.surfaceBg,
              color: useSidebarPalette ? spaceTheme.sidebarTextPrimary : spaceTheme.textPrimary,
            }
          : {}),
      }}
    >
      {displayName.charAt(0)}
    </Avatar>
  );
}

type BookshelfSidebarProps = {
  activeCategory: BookshelfNavCategory;
  counts: Record<BookshelfNavCategory, number>;
  layoutTheme: BookshelfLayoutTheme;
  decorImageSrc: string;
  customerName?: string;
  customerAvatarUrl?: string;
  onDecorImageError: () => void;
  onSelectCategory: (category: BookshelfNavCategory) => void;
  onNavigate?: () => void;
};

function BookshelfSidebar({
  activeCategory,
  counts,
  layoutTheme,
  decorImageSrc,
  customerName,
  customerAvatarUrl,
  onDecorImageError,
  onSelectCategory,
  onNavigate,
}: BookshelfSidebarProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const useSidebarPalette = hasDistinctSidebar(spaceTheme);
  const titleColor = useSidebarPalette ? spaceTheme.sidebarTextPrimary : spaceTheme.textPrimary;
  const subtitleColor = useSidebarPalette ? spaceTheme.sidebarTextSecondary : spaceTheme.textSecondary;
  const dividerColor = useSidebarPalette ? spaceTheme.sidebarDivider : spaceTheme.divider;

  return (
    <Stack sx={{ width: 1, height: 1, minHeight: 0 }}>
      <Stack spacing={0.75} sx={{ pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <BookshelfTitleAvatar
            customerName={customerName}
            customerAvatarUrl={customerAvatarUrl}
            size="sidebar"
          />

          <Typography
            variant="h5"
            sx={{
              fontFamily: MYSPACE_SECTION_SERIF,
              fontWeight: 600,
              color: titleColor,
              lineHeight: 1.2,
            }}
          >
            {BOOKSHELF_TITLE}
          </Typography>
        </Stack>

        <Typography
          variant="caption"
          sx={{
            pl: 6.75,
            color: subtitleColor,
            lineHeight: 1.45,
          }}
        >
          {BOOKSHELF_SUBTITLE}
        </Typography>
      </Stack>

      <Stack spacing={1} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
        {BOOKSHELF_NAV_ITEMS.map((item) => {
          const isActive = activeCategory === item.id;

          return (
            <Box
              key={item.id}
              component="button"
              type="button"
              onClick={() => {
                onSelectCategory(item.id);
                onNavigate?.();
              }}
              sx={{
                width: 1,
                p: 1.25,
                border: '1px solid',
                borderColor: isActive ? layoutTheme.activeNavBorder : 'transparent',
                borderRadius: 2.5,
                bgcolor: isActive ? layoutTheme.activeNavBg : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
                '&:hover': {
                  bgcolor: isActive ? layoutTheme.activeNavHoverBg : spaceTheme.accentSoft,
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: isActive ? layoutTheme.activeNavIconBg : spaceTheme.surfaceBg,
                    color: isActive ? layoutTheme.activeNavIconColor : spaceTheme.accent,
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon={item.icon} width={18} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, color: titleColor, lineHeight: 1.3 }}
                  >
                    {item.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: subtitleColor }}>
                    {item.sublabel}
                    {counts[item.id] > 0 ? ` · ${counts[item.id]}` : ''}
                  </Typography>
                </Box>

                <Iconify
                  icon="eva:arrow-ios-forward-fill"
                  width={16}
                  sx={{ color: subtitleColor, flexShrink: 0 }}
                />
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${dividerColor}` }}>
        <Box
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: `1px solid ${spaceTheme.border}`,
            bgcolor: spaceTheme.surfaceBg,
          }}
        >
          <Box
            component="img"
            src={decorImageSrc}
            alt=""
            onError={onDecorImageError}
            sx={{ width: 1, height: 'auto', display: 'block' }}
          />
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              px: 1.5,
              py: 1.25,
              fontStyle: 'italic',
              color: subtitleColor,
              lineHeight: 1.5,
            }}
          >
            {BOOKSHELF_SIDEBAR_QUOTE}
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}

export function UniverseLandingBookshelf({
  ebooks,
  audiobooks,
  showEbooks = false,
  showAudiobooks = false,
  loading = false,
  isOwner = false,
  ownerCustomerId,
  viewerCustomerId,
  authenticated = false,
  customerName,
  customerAvatarUrl,
}: Props) {
  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));
  const isWideDesktop = useMediaQuery(muiTheme.breakpoints.up('xl'));
  const { designType, theme: spaceTheme } = useDesignSpaceTheme();
  const layoutTheme = useMemo(
    () => getBookshelfLayoutTheme(designType, spaceTheme),
    [designType, spaceTheme],
  );
  const useSidebarPalette = hasDistinctSidebar(spaceTheme);

  const [localBorrowStatuses, setLocalBorrowStatuses] = useState<IBookshelfBorrow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeEntryKey, setActiveEntryKey] = useState<string | null>(null);
  const [requestingBorrow, setRequestingBorrow] = useState(false);
  const [navCategory, setNavCategory] = useState<BookshelfNavCategory>('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [decorImageSrc, setDecorImageSrc] = useState(() =>
    getMyspaceBookshelfDecorImageUrl(designType),
  );

  useEffect(() => {
    setDecorImageSrc(getMyspaceBookshelfDecorImageUrl(designType));
  }, [designType]);

  const bookIds = useMemo(() => {
    const ids: number[] = [];
    if (showEbooks) {
      ebooks.forEach((item) => ids.push(item.id));
    }
    if (showAudiobooks) {
      audiobooks.forEach((item) => ids.push(item.id));
    }
    return ids;
  }, [audiobooks, ebooks, showAudiobooks, showEbooks]);

  const ebookIds = useMemo(() => ebooks.map((item) => item.id), [ebooks]);

  const readingCountsCustomerId = ownerCustomerId || (isOwner ? viewerCustomerId : undefined);

  const { countsByBookId } = useGetBookshelfEbookReadingCounts(
    ebookIds,
    readingCountsCustomerId,
  );

  useEffect(() => {
    if (!readingCountsCustomerId || ebookIds.length === 0) {
      return;
    }

    revalidateBookshelfEbookReadingCounts(readingCountsCustomerId);
  }, [ebookIds, readingCountsCustomerId]);

  const canRequestBorrow = authenticated && !!viewerCustomerId && !isOwner && !!ownerCustomerId;
  const shouldLoadBorrowStatuses = authenticated && !!viewerCustomerId && !!ownerCustomerId && !isOwner;

  const { borrowStatuses, borrowStatusesLoading } = useGetBookshelfBorrowStatuses(
    shouldLoadBorrowStatuses ? viewerCustomerId : undefined,
    shouldLoadBorrowStatuses ? ownerCustomerId : undefined,
    shouldLoadBorrowStatuses ? bookIds : undefined,
  );

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

  const mergedBorrowStatuses = useMemo(() => {
    const map = new Map<string, IBookshelfBorrow>();

    [...borrowStatuses, ...localBorrowStatuses].forEach((borrow) => {
      const key = `${borrow.bookKind}-${borrow.bookId}`;
      map.set(key, borrow);
    });

    return Array.from(map.values());
  }, [borrowStatuses, localBorrowStatuses]);

  const isSearching = searchQuery.trim().length > 0;

  const navCounts = useMemo(
    () => getBookshelfNavCounts(bookshelfItems, mergedBorrowStatuses, countsByBookId),
    [bookshelfItems, countsByBookId, mergedBorrowStatuses],
  );

  const categoryItems = useMemo(
    () =>
      filterBookshelfByNavCategory(
        bookshelfItems,
        navCategory,
        mergedBorrowStatuses,
        countsByBookId,
      ),
    [bookshelfItems, countsByBookId, mergedBorrowStatuses, navCategory],
  );

  const filteredItems = useMemo(
    () => filterBookshelfItems(categoryItems, searchQuery),
    [categoryItems, searchQuery],
  );

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / BOOKSHELF_PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * BOOKSHELF_PAGE_SIZE;
    return filteredItems.slice(start, start + BOOKSHELF_PAGE_SIZE);
  }, [filteredItems, page, pageCount]);

  const shelfRows = useMemo(
    () => buildBookshelfShelfRows(paginatedItems),
    [paginatedItems],
  );

  const selectedEntry = useMemo(
    () => paginatedItems.find((entry) => getEntryKey(entry) === activeEntryKey) ?? null,
    [activeEntryKey, paginatedItems],
  );

  const selectedBorrowStatus = useMemo(() => {
    if (!selectedEntry) {
      return null;
    }

    return (
      mergedBorrowStatuses.find(
        (borrow) =>
          borrow.bookId === selectedEntry.item.id &&
          borrow.bookKind === selectedEntry.kind &&
          (borrow.status === 'pending' || borrow.status === 'approved'),
      ) || null
    );
  }, [mergedBorrowStatuses, selectedEntry]);

  useEffect(() => {
    if (paginatedItems.length === 0) {
      setActiveEntryKey(null);
      return;
    }

    const isActiveVisible =
      activeEntryKey != null && paginatedItems.some((entry) => getEntryKey(entry) === activeEntryKey);

    if (!isActiveVisible) {
      setActiveEntryKey(getEntryKey(paginatedItems[0]));
    }
  }, [activeEntryKey, paginatedItems]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [navCategory, searchQuery]);

  const handleSelect = useCallback((entry: BookshelfItem) => {
    setActiveEntryKey(getEntryKey(entry));
  }, []);

  const handleRequestBorrow = useCallback(
    async (borrowPeriodDays: number) => {
      if (!canRequestBorrow || !ownerCustomerId || !viewerCustomerId || !selectedEntry) {
        return;
      }

      try {
        setRequestingBorrow(true);
        const result = await requestBookshelfBorrow({
          borrowerCustomerId: viewerCustomerId,
          ownerCustomerId,
          bookKind: selectedEntry.kind,
          bookId: selectedEntry.item.id,
          borrowPeriodDays,
        });
        const createdBorrow = result?.borrow as IBookshelfBorrow | undefined;

        if (createdBorrow) {
          setLocalBorrowStatuses((prev) => {
            const key = `${createdBorrow.bookKind}-${createdBorrow.bookId}`;
            const next = prev.filter((item) => `${item.bookKind}-${item.bookId}` !== key);
            return [createdBorrow, ...next];
          });
        }

        toast.success('Borrow request sent.');
      } catch (error: unknown) {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message ===
            'string'
            ? (error as { response: { data: { message: string } } }).response.data.message
            : error instanceof Error
              ? error.message
              : 'Failed to send borrow request.';

        toast.error(message);
      } finally {
        setRequestingBorrow(false);
      }
    },
    [canRequestBorrow, ownerCustomerId, selectedEntry, viewerCustomerId],
  );

  const greetingName = (customerName || 'friend').split(' ')[0];
  const activeNavItem = BOOKSHELF_NAV_ITEMS.find((item) => item.id === navCategory);
  const showDetailBesideGrid = isWideDesktop;

  const getEntryBookMarks = useCallback(
    (entry: BookshelfItem) => {
      const readingCounts = getBookshelfReadingCountsForEntry(entry, countsByBookId);
      const hasReadingBookmarks = (readingCounts?.bookmarkCount ?? 0) > 0;

      const isCurrentlyReading =
        !!viewerCustomerId &&
        mergedBorrowStatuses.some(
          (borrow) =>
            borrow.status === 'approved' &&
            borrow.borrowerCustomerId === viewerCustomerId &&
            borrow.bookKind === entry.kind &&
            borrow.bookId === entry.item.id,
        );

      return {
        isFavorite: isBookFavorite(entry.item.isFavorite),
        hasBookmarks: hasReadingBookmarks || isCurrentlyReading,
        hasComments: (readingCounts?.commentCount ?? 0) > 0,
      };
    },
    [countsByBookId, mergedBorrowStatuses, viewerCustomerId],
  );

  const shelfGridTemplateColumns = showDetailBesideGrid
    ? BOOKSHELF_GRID_TEMPLATE_COLUMNS_COMPACT
    : BOOKSHELF_GRID_TEMPLATE_COLUMNS;

  const sidebar = (
    <BookshelfSidebar
      activeCategory={navCategory}
      counts={navCounts}
      layoutTheme={layoutTheme}
      decorImageSrc={decorImageSrc}
      customerName={customerName}
      customerAvatarUrl={customerAvatarUrl}
      onDecorImageError={() => {
        setDecorImageSrc(getMyspaceBookshelfDecorImageFallbackUrl());
      }}
      onSelectCategory={setNavCategory}
      onNavigate={() => {
        if (!isDesktop) {
          setMobileNavOpen(false);
        }
      }}
    />
  );

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        height: { xs: 'auto', lg: 1 },
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        bgcolor: spaceTheme.contentBg,
        color: spaceTheme.textPrimary,
        overflow: 'hidden',
      }}
    >
      {isDesktop ? (
        <Box
          component="aside"
          sx={{
            width: 350,
            flexShrink: 0,
            minHeight: 0,
            height: { lg: '100%' },
            display: 'flex',
            flexDirection: 'column',
            px: 2,
            py: 2.5,
            mr: 2,
            borderRight: `1px solid ${useSidebarPalette ? spaceTheme.sidebarBorder : spaceTheme.divider}`,
            bgcolor: useSidebarPalette ? spaceTheme.sidebarBg : spaceTheme.pageBg,
            color: useSidebarPalette ? spaceTheme.sidebarTextPrimary : spaceTheme.textPrimary,
          }}
        >
          {sidebar}
        </Box>
      ) : null}

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: { lg: '100%' },
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 2.5 },
          overflow: { xs: 'visible', lg: 'hidden' },
        }}
      >
        {!isDesktop ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ pb: 1.5 }}>
            <IconButton onClick={() => setMobileNavOpen(true)} aria-label="Open bookshelf navigation">
              <Iconify icon="solar:hamburger-menu-linear" />
            </IconButton>
            <BookshelfTitleAvatar
              customerName={customerName}
              customerAvatarUrl={customerAvatarUrl}
              size="mobile"
            />
            <Stack spacing={0} sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontFamily: MYSPACE_SECTION_SERIF, fontWeight: 600, lineHeight: 1.2 }}>
                {BOOKSHELF_TITLE}
              </Typography>
              <Typography variant="caption" sx={{ color: spaceTheme.textSecondary, lineHeight: 1.3 }}>
                {BOOKSHELF_SUBTITLE}
              </Typography>
            </Stack>
          </Stack>
        ) : null}

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ pb: 2, flexShrink: 0 }}
        >
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography
              variant="h4"
              sx={{
                fontFamily: MYSPACE_SECTION_SERIF,
                fontWeight: 600,
                color: spaceTheme.textPrimary,
                fontSize: { xs: '1.35rem', md: '1.6rem' },
              }}
            >
              {activeNavItem?.label ?? 'All Books'}
            </Typography>
            <Typography variant="body2" sx={{ color: spaceTheme.textSecondary }}>
              Hello, {greetingName}!
              {activeNavItem?.sublabel ? ` · ${activeNavItem.sublabel}` : ''}
              {isSearching ? ` · ${filteredItems.length} result${filteredItems.length === 1 ? '' : 's'}` : ''}
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ minWidth: { md: 360 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.85,
                flex: 1,
                minWidth: 0,
                borderRadius: 999,
                bgcolor: spaceTheme.surfaceBg,
                border: `1px solid ${spaceTheme.border}`,
              }}
            >
              <Iconify icon="eva:search-fill" width={18} sx={{ color: spaceTheme.accent, flexShrink: 0 }} />
              <InputBase
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search books..."
                inputProps={{ 'aria-label': 'Search bookshelf' }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 14,
                  color: spaceTheme.textPrimary,
                  '& input::placeholder': {
                    color: spaceTheme.textSecondary,
                    opacity: 1,
                  },
                }}
              />
              {isSearching ? (
                <IconButton
                  size="small"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  sx={{ color: spaceTheme.textSecondary }}
                >
                  <Iconify icon="mingcute:close-line" width={18} />
                </IconButton>
              ) : null}
            </Box>

            {isOwner ? (
              <Button
                component={RouterLink}
                href={paths.dashboard.bookshelf.root}
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                sx={{
                  borderRadius: 999,
                  px: 2.25,
                  whiteSpace: 'nowrap',
                  bgcolor: spaceTheme.accent,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: spaceTheme.accentHover, boxShadow: 'none' },
                }}
              >
                Add Book
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Box
          sx={{
            ...layoutTheme.woodFrameSx,
            flex: '1 1 0',
            minHeight: { xs: 420, lg: 0 },
            p: { xs: 1.25, md: 2 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
              <Iconify
                icon="solar:refresh-outline"
                width={24}
                sx={{ color: layoutTheme.loadingIconColor, mb: 1 }}
              />
              <Typography variant="body2" sx={{ color: layoutTheme.loadingTextColor }}>
                Loading bookshelf...
              </Typography>
            </Stack>
          ) : filteredItems.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 10, flex: 1 }}>
              <Iconify icon="solar:book-2-bold" width={40} sx={{ color: layoutTheme.emptyIconColor }} />
              <Typography variant="subtitle1" sx={{ color: layoutTheme.emptyTitleColor, fontWeight: 700 }}>
                {isSearching ? 'No books match your search' : 'No books in this shelf yet'}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: layoutTheme.emptyBodyColor, maxWidth: 320, textAlign: 'center' }}
              >
                {isOwner
                  ? 'Add a book with a cover image from your bookshelf dashboard.'
                  : 'Check back soon for shared books.'}
              </Typography>
            </Stack>
          ) : (
            <Stack
              direction={{ xs: 'column', xl: 'row' }}
              spacing={{ xs: 1.5, xl: 2 }}
              sx={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}
            >
              <Box
                sx={{
                  // flex: showDetailBesideGrid ? { xl: '3 1 0' } : '1 1 0',
                  flex: { lg: '0 0 65%' },
                  width: 1,
                  minWidth: 0,
                  height: showDetailBesideGrid ? { xl: '100%' } : 'auto',
                  px: { xs: 0.25, md: 0.75 },
                  py: 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 1.25, lg: 1 },
                  minHeight: 0,
                  overflowX: 'hidden',
                  overflowY: { xs: 'auto', xl: showDetailBesideGrid ? 'auto' : 'visible' },
                }}
              >
                {shelfRows.map((shelf, shelfIndex) => (
                  <Box
                    key={`bookshelf-shelf-${shelf.label ?? shelfIndex}`}
                    sx={{
                      flex: '0 0 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      pt: { xs: 1, md: 2 },
                      gap: { xs: 1.25, lg: 1 },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: shelfGridTemplateColumns,
                        gap: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
                        alignItems: 'start',
                        px: 0.5,
                        pb: 0.5,
                      }}
                    >
                      {padShelfEntries(shelf.entries).map((entry, columnIndex) => (
                        <Box
                          key={
                            entry
                              ? getEntryKey(entry)
                              : `bookshelf-slot-${shelf.label ?? shelfIndex}-${columnIndex}`
                          }
                          sx={{ minWidth: 0 }}
                        >
                          {entry ? (
                            <BookshelfBookCover
                              entry={entry}
                              variant="themed"
                              active={activeEntryKey === getEntryKey(entry)}
                              {...getEntryBookMarks(entry)}
                              onSelect={handleSelect}
                            />
                          ) : (
                            <BookshelfShelfSlotPlaceholder />
                          )}
                        </Box>
                      ))}
                    </Box>
                    <Box sx={layoutTheme.shelfBoardSx} />
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  flex: showDetailBesideGrid ? { xl: '2 1 0' } : '0 0 auto',
                  minWidth: { xl: 280 },
                  width: showDetailBesideGrid ? undefined : 1,
                  ...PARCHMENT_SX,
                  borderRadius: 1.5,
                  border: '1px solid rgba(74,47,35,0.1)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: { xs: 280, xl: showDetailBesideGrid ? 0 : 280 },
                  height: showDetailBesideGrid ? { xl: '100%' } : 'auto',
                  mx: { xl: 0.5 },
                }}
              >
                {navCategory === 'quotes' ? (
                  <BookshelfBookQuotesPanel
                    entry={selectedEntry}
                    commentsCustomerId={readingCountsCustomerId}
                    viewerCustomerId={viewerCustomerId}
                  />
                ) : (
                  <BookshelfBookDetailPanel
                    entry={selectedEntry}
                    borrowStatus={selectedBorrowStatus}
                    canRequestBorrow={canRequestBorrow && !borrowStatusesLoading}
                    viewerCustomerId={viewerCustomerId}
                    requestingBorrow={requestingBorrow}
                    onRequestBorrow={handleRequestBorrow}
                  />
                )}
              </Box>
            </Stack>
          )}

          {filteredItems.length > 0 ? (
            <Stack alignItems="center" sx={{ pt: 1.5, flexShrink: 0 }}>
              <Pagination
                count={pageCount}
                page={Math.min(page, pageCount)}
                onChange={(_, value) => setPage(value)}
                shape="rounded"
                size="small"
                siblingCount={0}
                boundaryCount={1}
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: layoutTheme.paginationColor,
                    fontWeight: 600,
                  },
                  '& .Mui-selected': {
                    bgcolor: `${layoutTheme.paginationSelectedBg} !important`,
                    color: `${layoutTheme.paginationSelectedColor} !important`,
                  },
                }}
              />
            </Stack>
          ) : null}

          <Typography
            variant="caption"
            sx={{
              pt: 1.5,
              textAlign: 'center',
              color: spaceTheme.textSecondary,
              fontStyle: 'italic',
              flexShrink: 0,
            }}
          >
            {BOOKSHELF_FOOTER_QUOTE}
          </Typography>
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={!isDesktop && mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            p: 2,
            bgcolor: useSidebarPalette ? spaceTheme.sidebarBg : spaceTheme.pageBg,
            color: useSidebarPalette ? spaceTheme.sidebarTextPrimary : spaceTheme.textPrimary,
          },
        }}
      >
        {sidebar}
      </Drawer>
    </Box>
  );
}
