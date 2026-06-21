import type { SxProps, Theme } from '@mui/material/styles';

/** Fixed card width for Blogs, Albums, Drawers, and Collections in My Space. */
export const MYSPACE_ITEM_CARD_WIDTH = 304;

export const MYSPACE_ITEM_GRID_GAP = 20;

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
