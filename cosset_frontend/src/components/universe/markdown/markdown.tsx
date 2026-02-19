import type { BoxProps } from '@mui/material/Box';

import { StyledRoot } from './styles';

// ----------------------------------------------------------------------

export type MarkdownProps = BoxProps & {
  content: string;
  firstLetter?: boolean;
};

export function Markdown({ content, firstLetter = false, ...other }: MarkdownProps) {
  return (
    <StyledRoot
      firstLetter={firstLetter}
      dangerouslySetInnerHTML={{ __html: content }}
      {...other}
    />
  );
}
