import { useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';

import { varAlpha } from 'src/theme/dashboard/styles';
import {
  MAIL_PAPER_STYLE_OPTIONS,
  getMailPaperPreviewStyles,
  type MailPaperStyleId,
} from 'src/constants/mail-paper-styles';

import { Iconify } from '../../iconify';

import type { EditorToolbarProps } from '../types';

// ----------------------------------------------------------------------

export function PaperStyleBlock({
  paperStyle,
  onPaperStyleChange,
  disabled,
}: Pick<EditorToolbarProps, 'paperStyle' | 'onPaperStyleChange' | 'disabled'>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!paperStyle || !onPaperStyleChange) {
    return null;
  }

  const currentLabel =
    MAIL_PAPER_STYLE_OPTIONS.find((option) => option.id === paperStyle)?.label ?? 'Paper';
  const currentPreview = getMailPaperPreviewStyles(paperStyle);

  const handleSelect = (value: MailPaperStyleId) => {
    onPaperStyleChange(value);
    setAnchorEl(null);
  };

  return (
    <>
      <ButtonBase
        aria-label="Paper style"
        aria-controls={anchorEl ? 'paper-style-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={anchorEl ? 'true' : undefined}
        disabled={disabled}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          px: 1,
          gap: 0.75,
          minWidth: 120,
          height: 32,
          borderRadius: 0.75,
          typography: 'body2',
          justifyContent: 'space-between',
          border: (theme) => `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: 0.5,
              flexShrink: 0,
              overflow: 'hidden',
              ...currentPreview,
              minHeight: 0,
              p: 0,
            }}
          />
          <Box
            component="span"
            sx={{ maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {currentLabel}
          </Box>
        </Stack>
        <Iconify
          width={16}
          icon={anchorEl ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
        />
      </ButtonBase>

      <Menu
        id="paper-style-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: { mt: 0.5, p: 1.25, maxWidth: 360 },
          },
        }}
      >
        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
          {MAIL_PAPER_STYLE_OPTIONS.map((option) => {
            const selected = option.id === paperStyle;
            const preview = getMailPaperPreviewStyles(option.id);

            return (
              <ButtonBase
                key={option.id}
                aria-label={option.label}
                aria-pressed={selected}
                onClick={() => handleSelect(option.id)}
                sx={{
                  width: 72,
                  p: 0.5,
                  borderRadius: 1,
                  border: (theme) =>
                    selected
                      ? `2px solid ${theme.vars.palette.primary.main}`
                      : `1px solid ${theme.vars.palette.divider}`,
                }}
              >
                <Box
                  sx={{
                    width: 1,
                    height: 48,
                    borderRadius: 0.75,
                    overflow: 'hidden',
                    ...preview,
                    minHeight: 0,
                    p: 0,
                  }}
                />
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    typography: 'caption',
                    color: selected ? 'primary.main' : 'text.secondary',
                    fontSize: '0.625rem',
                    lineHeight: 1.2,
                  }}
                >
                  {option.label}
                </Box>
              </ButtonBase>
            );
          })}
        </Stack>
      </Menu>
    </>
  );
}
