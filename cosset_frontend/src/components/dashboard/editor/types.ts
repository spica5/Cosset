import type { Theme, SxProps } from '@mui/material/styles';
import type { Editor, Extension, EditorOptions } from '@tiptap/react';

import type { MailPaperStyleId } from 'src/constants/mail-paper-styles';

// ----------------------------------------------------------------------

export type EditorProps = Partial<EditorOptions> & {
  value?: string;
  error?: boolean;
  fullItem?: boolean;
  /** Handwriting fonts and ink colors for mail-style writing. */
  typographyTools?: boolean;
  /** Letter paper background style for mail writing. */
  paperStyle?: MailPaperStyleId | null;
  onPaperStyleChange?: (value: MailPaperStyleId) => void;
  className?: string;
  sx?: SxProps<Theme>;
  resetValue?: boolean;
  placeholder?: string;
  helperText?: React.ReactNode;
  onChange?: (value: string) => void;
  slotProps?: {
    wrap: SxProps<Theme>;
  };
};

export type EditorToolbarProps = {
  fullScreen: boolean;
  editor: Editor | null;
  onToggleFullScreen: () => void;
  fullItem?: EditorProps['fullItem'];
  typographyTools?: EditorProps['typographyTools'];
  paperStyle?: EditorProps['paperStyle'];
  onPaperStyleChange?: EditorProps['onPaperStyleChange'];
  disabled?: boolean;
};

export type EditorToolbarItemProps = {
  icon?: React.ReactNode;
  label?: string;
  active?: boolean;
  disabled?: boolean;
};

export type EditorCodeHighlightBlockProps = {
  extension: Extension;
  updateAttributes: (attributes: Record<string, any>) => void;
  node: {
    attrs: {
      language: string;
    };
  };
};
