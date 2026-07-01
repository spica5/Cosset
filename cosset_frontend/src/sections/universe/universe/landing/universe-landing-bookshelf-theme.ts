import type { IBookshelfBorrow } from 'src/types/bookshelf-borrow';
import type { DesignSpaceType, DesignSpaceTheme } from 'src/utils/design-space-type';

import { isBookFavorite } from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

import {
  getEntryKey,
  SHELF_COUNT,
  BOOKS_PER_SHELF,
  splitEntriesIntoShelves,
  type BookshelfItem,
} from './universe-landing-bookshelf-utils';
// ----------------------------------------------------------------------

export type BookshelfNavCategory = 'all' | 'favorites' | 'currently-reading' | 'quotes';

export type BookshelfNavItem = {
  id: BookshelfNavCategory;
  label: string;
  sublabel: string;
  icon: string;
};

export type BookshelfShelfRow = {
  label: string | null;
  entries: BookshelfItem[];
};

export const BOOKSHELF_PAGE_SIZE = SHELF_COUNT * BOOKS_PER_SHELF;

export const BOOKSHELF_NAV_ITEMS: BookshelfNavItem[] = [
  { id: 'all', label: 'All Books', sublabel: 'Every shared title', icon: 'solar:book-2-bold' },
  { id: 'favorites', label: 'Favorites', sublabel: 'Loved picks', icon: 'solar:heart-bold' },
  {
    id: 'currently-reading',
    label: 'Currently Reading',
    sublabel: 'On your shelf now',
    icon: 'solar:cup-hot-bold',
  },
  { id: 'quotes', label: 'Quotes', sublabel: 'Words that stayed', icon: 'solar:chat-round-dots-bold' },
];

export const BOOKSHELF_SHELF_LABELS = ['FAVORITES', 'TO READ', 'COLLECTIONS'] as const;

export const BOOKSHELF_TITLE = 'My Bookshelf';

export const BOOKSHELF_SUBTITLE = 'E-books, audiobooks, and shared favorites.';

export const BOOKSHELF_FOOTER_QUOTE =
  'A room without books is like a body without a soul. — Cicero';

export const BOOKSHELF_SIDEBAR_QUOTE = 'Little by little, a little becomes a lot.';

export type BookshelfLayoutTheme = {
  woodFrameSx: Record<string, unknown>;
  shelfBoardSx: Record<string, unknown>;
  shelfLabelColor: string;
  shelfIconColor: string;
  emptyIconColor: string;
  emptyTitleColor: string;
  emptyBodyColor: string;
  loadingIconColor: string;
  loadingTextColor: string;
  paginationColor: string;
  paginationSelectedBg: string;
  paginationSelectedColor: string;
  activeNavBorder: string;
  activeNavBg: string;
  activeNavHoverBg: string;
  activeNavIconBg: string;
  activeNavIconColor: string;
  coverActiveBorder: string;
  coverTitleColor: string;
  coverTitleActiveColor: string;
};

const LIGHT_WOOD_BY_DESIGN: Record<
  Exclude<DesignSpaceType, 'strong-modern'>,
  Pick<BookshelfLayoutTheme, 'woodFrameSx' | 'shelfBoardSx' | 'shelfLabelColor' | 'shelfIconColor'>
> = {
  'gentle-feminine-romantic': {
    woodFrameSx: {
      borderRadius: 2.5,
      border: '8px solid #F8BBD0',
      background: 'linear-gradient(180deg, #FFF8F5 0%, #FDEFE8 48%, #F8E8E4 100%)',
      boxShadow: '0 14px 36px rgba(248, 187, 208, 0.12), inset 0 1px 0 rgba(255,255,255,0.55)',
    },
    shelfBoardSx: {
      height: 12,
      borderRadius: '4px',
      background: 'linear-gradient(180deg, #FFF5F0 0%, #FAD4C8 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), 0 3px 8px rgba(180, 120, 100, 0.06)',
    },
    shelfLabelColor: '#4E342E',
    shelfIconColor: '#F8BBD0',
  },
  'serene-elegant': {
    woodFrameSx: {
      borderRadius: 2,
      border: '8px solid #B89968',
      background: 'linear-gradient(180deg, #E8D8BC 0%, #D4BC94 48%, #C4A574 100%)',
      boxShadow: '0 14px 36px rgba(100, 80, 60, 0.1), inset 0 1px 0 rgba(255,255,255,0.45)',
    },
    shelfBoardSx: {
      height: 12,
      borderRadius: '2px',
      background: 'linear-gradient(180deg, #F0E2C8 0%, #DCC7A2 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), 0 3px 8px rgba(80, 60, 40, 0.08)',
    },
    shelfLabelColor: '#6B5342',
    shelfIconColor: '#8B6B4F',
  },
  'warm-nostalgic': {
    woodFrameSx: {
      borderRadius: 2,
      border: '8px solid #B8956E',
      background: 'linear-gradient(180deg, #EDDCC4 0%, #D9C4A0 48%, #C8AD82 100%)',
      boxShadow: '0 14px 36px rgba(120, 90, 60, 0.12), inset 0 1px 0 rgba(255,255,255,0.42)',
    },
    shelfBoardSx: {
      height: 12,
      borderRadius: '2px',
      background: 'linear-gradient(180deg, #F5E8D2 0%, #E2CCAA 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.48), 0 3px 8px rgba(100, 75, 45, 0.1)',
    },
    shelfLabelColor: '#6B4E36',
    shelfIconColor: '#8B6848',
  },
  'young-dynamic': {
    woodFrameSx: {
      borderRadius: 3,
      border: '3px solid rgba(139, 92, 246, 0.22)',
      background: 'linear-gradient(180deg, #FAFBFF 0%, #F5F3FF 48%, #EDE9FE 100%)',
      boxShadow: '0 14px 36px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255,255,255,0.75)',
    },
    shelfBoardSx: {
      height: 12,
      borderRadius: '8px',
      background: 'linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.55), 0 3px 8px rgba(139, 92, 246, 0.1)',
    },
    shelfLabelColor: '#6D28D9',
    shelfIconColor: '#8B5CF6',
  },
};

export function getBookshelfLayoutTheme(
  designType: DesignSpaceType,
  theme: DesignSpaceTheme,
): BookshelfLayoutTheme {
  const navTokens = {
    activeNavBorder: `${theme.accent}66`,
    activeNavBg: theme.accentSoft,
    activeNavHoverBg: `${theme.accent}30`,
    activeNavIconBg: theme.surfaceBg,
    activeNavIconColor: theme.accent,
  };

  const coverTokens = {
    coverActiveBorder: theme.accent,
    coverTitleColor: theme.textSecondary,
    coverTitleActiveColor: theme.accent,
  };

  if (theme.isDark || designType === 'strong-modern') {
    return {
      woodFrameSx: {
        borderRadius: 2,
        border: `8px solid ${theme.border}`,
        background: `linear-gradient(180deg, ${theme.cardBg} 0%, ${theme.surfaceBg} 50%, ${theme.pageBg} 100%)`,
        boxShadow: '0 14px 36px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      shelfBoardSx: {
        height: 12,
        borderRadius: '2px',
        background: `linear-gradient(180deg, ${theme.surfaceBg} 0%, ${theme.cardBg} 100%)`,
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.06), 0 3px 8px rgba(0, 0, 0, 0.22)',
      },
      shelfLabelColor: theme.textSecondary,
      shelfIconColor: theme.accent,
      emptyIconColor: theme.textSecondary,
      emptyTitleColor: theme.textPrimary,
      emptyBodyColor: theme.textSecondary,
      loadingIconColor: theme.accent,
      loadingTextColor: theme.textSecondary,
      paginationColor: theme.textSecondary,
      paginationSelectedBg: theme.accentSoft,
      paginationSelectedColor: theme.textPrimary,
      ...navTokens,
      ...coverTokens,
    };
  }

  const wood = LIGHT_WOOD_BY_DESIGN[designType as Exclude<DesignSpaceType, 'strong-modern'>]
    ?? LIGHT_WOOD_BY_DESIGN['serene-elegant'];

  return {
    ...wood,
    emptyIconColor: wood.shelfIconColor,
    emptyTitleColor: wood.shelfLabelColor,
    emptyBodyColor: theme.textSecondary,
    loadingIconColor: wood.shelfIconColor,
    loadingTextColor: theme.textSecondary,
    paginationColor: wood.shelfLabelColor,
    paginationSelectedBg: theme.accentSoft,
    paginationSelectedColor: wood.shelfLabelColor,
    ...navTokens,
    ...coverTokens,
  };
}

export function filterBookshelfByNavCategory(
  items: BookshelfItem[],
  category: BookshelfNavCategory,
  borrowStatuses: IBookshelfBorrow[],
) {
  if (category === 'favorites') {
    return items.filter((entry) => isBookFavorite(entry.item.isFavorite));
  }

  if (category === 'currently-reading') {
    const approvedKeys = new Set(
      borrowStatuses
        .filter((borrow) => borrow.status === 'approved')
        .map((borrow) => `${borrow.bookKind}-${borrow.bookId}`),
    );

    return items.filter((entry) => approvedKeys.has(getEntryKey(entry)));
  }

  if (category === 'quotes') {
    return items.filter((entry) => (entry.item.description || '').trim().length > 0);
  }

  return items;
}

export function buildBookshelfShelfRows(
  items: BookshelfItem[],
  category: BookshelfNavCategory,
  showCuratedLabels: boolean,
): BookshelfShelfRow[] {
  if (category === 'all' && showCuratedLabels) {
    const favorites = items.filter((entry) => isBookFavorite(entry.item.isFavorite));
    const remaining = items.filter((entry) => !isBookFavorite(entry.item.isFavorite));
    const midpoint = Math.ceil(remaining.length / 2);

    return [
      { label: BOOKSHELF_SHELF_LABELS[0], entries: favorites.slice(0, BOOKS_PER_SHELF) },
      { label: BOOKSHELF_SHELF_LABELS[1], entries: remaining.slice(0, midpoint).slice(0, BOOKS_PER_SHELF) },
      {
        label: BOOKSHELF_SHELF_LABELS[2],
        entries: remaining.slice(midpoint).slice(0, BOOKS_PER_SHELF),
      },
    ];
  }

  return splitEntriesIntoShelves(items).map((entries) => ({
    label: null,
    entries,
  }));
}

export function getBookshelfNavCounts(
  items: BookshelfItem[],
  borrowStatuses: IBookshelfBorrow[],
): Record<BookshelfNavCategory, number> {
  return {
    all: items.length,
    favorites: filterBookshelfByNavCategory(items, 'favorites', borrowStatuses).length,
    'currently-reading': filterBookshelfByNavCategory(items, 'currently-reading', borrowStatuses)
      .length,
    quotes: filterBookshelfByNavCategory(items, 'quotes', borrowStatuses).length,
  };
}
