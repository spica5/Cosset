import type { SxProps, Theme } from '@mui/material/styles';

import { editorClasses } from 'src/components/dashboard/editor/classes';

// ----------------------------------------------------------------------

export const MAIL_COMPOSE_POSITION = 20;

export const MAIL_COMPOSE_WIDTH = 800;

export const MAIL_COMPOSE_HEIGHT = 720;

export const mailComposePaperSx = (fullScreen: boolean): SxProps<Theme> => ({
  maxWidth: MAIL_COMPOSE_WIDTH,
  right: MAIL_COMPOSE_POSITION,
  borderRadius: 2,
  display: 'flex',
  bottom: MAIL_COMPOSE_POSITION,
  position: 'fixed',
  overflow: 'hidden',
  flexDirection: 'column',
  zIndex: (theme) => theme.zIndex.modal,
  width: `min(${MAIL_COMPOSE_WIDTH}px, calc(100% - ${MAIL_COMPOSE_POSITION * 2}px))`,
  maxHeight: `calc(100vh - ${MAIL_COMPOSE_POSITION * 2}px)`,
  height: fullScreen
    ? `calc(100vh - ${MAIL_COMPOSE_POSITION * 2}px)`
    : `min(${MAIL_COMPOSE_HEIGHT}px, calc(100vh - ${MAIL_COMPOSE_POSITION * 2}px))`,
  boxShadow: (theme) => theme.customShadows.dropdown,
  ...(fullScreen && {
    maxWidth: 1,
  }),
});

export const mailComposeEditorSx = (fullScreen: boolean): SxProps<Theme> => ({
  flex: '1 1 auto',
  minHeight: 0,
  maxHeight: fullScreen ? 1 : 'none',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  [`& .${editorClasses.root}`]: {
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  [`& .${editorClasses.content.root}`]: {
    flex: '1 1 auto',
    minHeight: 0,
    overflowY: 'auto',
  },
  [`& .${editorClasses.toolbar.root}`]: {
    flexShrink: 0,
    py: 1,
    rowGap: 0.5,
    alignContent: 'flex-start',
  },
});
