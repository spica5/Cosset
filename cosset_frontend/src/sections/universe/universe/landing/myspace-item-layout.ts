import type { SxProps, Theme } from '@mui/material/styles';

/** Fixed card width for Albums, Drawers, and Collections in My Space. */
export const MYSPACE_ITEM_CARD_WIDTH = 304;

export const MYSPACE_ITEM_GRID_GAP = 20;

export const MYSPACE_BLOG_GRID_GAP = 16;

export const MYSPACE_BLOG_ITEM_MIN_WIDTH = 220;

export const MYSPACE_BLOG_LIST_PAGE_SIZE = 6;

export const MYSPACE_BLOG_GRID_COLUMNS = 3;

export const myspaceItemGridSx: SxProps<Theme> = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${MYSPACE_ITEM_GRID_GAP}px`,
  alignItems: 'stretch',
};

export const myspaceItemCardSx: SxProps<Theme> = {
  width: { xs: '100%', sm: MYSPACE_ITEM_CARD_WIDTH },
  maxWidth: { xs: '100%', sm: MYSPACE_ITEM_CARD_WIDTH },
  minWidth: { xs: 0, sm: MYSPACE_ITEM_CARD_WIDTH },
  flexShrink: 0,
  display: 'flex',
  '& > *': {
    width: 1,
    flex: 1,
  },
};

type BlogListGridOptions = {
  itemCount: number;
  pageSize?: number;
  columnCount?: number;
};

export function getBlogGridColumnCount(
  containerWidth: number,
  minItemWidth: number = MYSPACE_BLOG_ITEM_MIN_WIDTH,
  maxColumns: number = MYSPACE_BLOG_GRID_COLUMNS,
  gap: number = MYSPACE_BLOG_GRID_GAP,
): number {
  if (containerWidth <= 0) {
    return maxColumns;
  }

  let columns = maxColumns;

  while (columns > 1 && (containerWidth - (columns - 1) * gap) / columns < minItemWidth) {
    columns -= 1;
  }

  return columns;
}

/** Six-slot blog grid for tablet/desktop; stacks on mobile. */
export const myspaceBlogListGridSx = ({
  itemCount,
  pageSize = MYSPACE_BLOG_LIST_PAGE_SIZE,
  columnCount = MYSPACE_BLOG_GRID_COLUMNS,
}: BlogListGridOptions): SxProps<Theme> => {
  const visibleItemCount = Math.min(itemCount, pageSize);
  const rowCount = Math.max(1, Math.ceil(visibleItemCount / columnCount));
  const isFullPage = itemCount >= pageSize;

  return {
    display: { xs: 'flex', sm: 'grid' },
    flexDirection: { xs: 'column', sm: 'unset' },
    gridTemplateColumns: { sm: `repeat(${columnCount}, minmax(0, 1fr))` },
    gridTemplateRows: { sm: `repeat(${rowCount}, minmax(0, 1fr))` },
    gap: { xs: 2, sm: `${MYSPACE_BLOG_GRID_GAP}px` },
    width: 1,
    minHeight: {
      sm: isFullPage ? 'clamp(520px, calc(100dvh - 280px), 860px)' : 'auto',
    },
    height: {
      sm: isFullPage ? 'clamp(520px, calc(100dvh - 280px), 860px)' : 'auto',
    },
    alignItems: 'stretch',
  };
};

export const myspaceBlogListGridItemSx: SxProps<Theme> = {
  display: 'flex',
  minWidth: 0,
  minHeight: { xs: 0, sm: 0 },
  width: { xs: 1, sm: 'auto' },
  height: { xs: 'auto', sm: 1 },
  '& > *': {
    width: 1,
    flex: 1,
    minHeight: 0,
  },
};
