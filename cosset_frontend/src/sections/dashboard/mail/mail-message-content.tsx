'use client';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import {
  getMailPaperSurfaceStyles,
  type MailPaperStyleId,
} from 'src/constants/mail-paper-styles';

import { useMailPaperBackgroundUrl } from './use-mail-paper-background-url';
import { resolveMailMessageContent, resolveMailPaperStyle } from './mail-paper-utils';

// ----------------------------------------------------------------------

type Props = {
  message: string;
  paperStyle?: MailPaperStyleId | string | null;
  paperBackgroundImage?: string | null;
};

const isHtmlContent = (message: string) => /<[a-z][\s\S]*>/i.test(message.trim());

export function MailMessageContent({ message, paperStyle, paperBackgroundImage }: Props) {
  const theme = useTheme();
  const resolvedPaperStyle = resolveMailPaperStyle(message, paperStyle);
  const trimmed = resolveMailMessageContent(message, paperStyle).trim();
  const backgroundUrl = useMailPaperBackgroundUrl(paperBackgroundImage);
  const paperSurface = getMailPaperSurfaceStyles(theme, resolvedPaperStyle, backgroundUrl, 'message');

  if (!trimmed) {
    return null;
  }

  const baseSx = {
    ...paperSurface,
    mx: 2,
    typography: 'body2',
    wordBreak: 'break-word',
  };

  if (!isHtmlContent(trimmed)) {
    return (
      <Box sx={{ ...baseSx, whiteSpace: 'pre-wrap' }}>
        {trimmed}
      </Box>
    );
  }

  return (
    <Box
      className="mail-message-content"
      sx={{
        ...baseSx,
        '& p': { typography: 'body2', m: 0, mb: 1.25 },
        '& p:last-child': { mb: 0 },
        '& blockquote': {
          m: 0,
          pl: 2,
          borderLeft: `3px solid ${theme.vars.palette.divider}`,
          color: 'text.secondary',
        },
        '& ul, & ol': { pl: 3, my: 1 },
        '& a': { color: 'primary.main' },
      }}
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}
