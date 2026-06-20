'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { varAlpha } from 'src/theme/dashboard/styles';
import {
  MAIL_PAPER_STYLE_OPTIONS,
  getMailPaperPreviewStyles,
  type MailPaperStyleId,
} from 'src/constants/mail-paper-styles';
import { MailPaperBackgroundPickerContent } from 'src/sections/dashboard/mail/mail-paper-background-picker';
import { useMailPaperBackgroundUrl } from 'src/sections/dashboard/mail/use-mail-paper-background-url';

import { Iconify } from '../../iconify';

import type { EditorToolbarProps } from '../types';

// ----------------------------------------------------------------------

export function PaperStyleBlock({
  paperStyle,
  onPaperStyleChange,
  paperBackgroundImage,
  onPaperBackgroundImageChange,
  disabled,
}: Pick<
  EditorToolbarProps,
  | 'paperStyle'
  | 'onPaperStyleChange'
  | 'paperBackgroundImage'
  | 'onPaperBackgroundImageChange'
  | 'disabled'
>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const backgroundPreviewUrl = useMailPaperBackgroundUrl(paperBackgroundImage);

  if (!paperStyle || !onPaperStyleChange) {
    return null;
  }

  const currentLabel =
    MAIL_PAPER_STYLE_OPTIONS.find((option) => option.id === paperStyle)?.label ?? 'Paper';
  const currentPreview = getMailPaperPreviewStyles(paperStyle);
  const hasBackground = Boolean(paperBackgroundImage);
  const displayLabel = hasBackground ? 'image' : currentLabel;

  const handleSelectStyle = (value: MailPaperStyleId) => {
    onPaperStyleChange(value);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <ButtonBase
        aria-label="Paper and background"
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
          border: (theme) =>
            `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
          ...(hasBackground && {
            borderColor: 'primary.main',
          }),
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            {hasBackground && backgroundPreviewUrl ? (
              <Box
                component="img"
                src={backgroundPreviewUrl}
                alt="Background"
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 0.5,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 0.5,
                  overflow: 'hidden',
                  ...currentPreview,
                  minHeight: 0,
                  p: 0,
                }}
              />
            )}
          </Box>
          <Box
            component="span"
            sx={{ maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {displayLabel}
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
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: { mt: 0.5, p: 1.5, maxWidth: 360, maxHeight: 'min(80vh, 560px)', overflowY: 'auto' },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Paper style
        </Typography>

        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ mb: 1.5 }}>
          {MAIL_PAPER_STYLE_OPTIONS.map((option) => {
            const selected = option.id === paperStyle;
            const preview = getMailPaperPreviewStyles(option.id);

            return (
              <ButtonBase
                key={option.id}
                aria-label={option.label}
                aria-pressed={selected}
                onClick={() => handleSelectStyle(option.id)}
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

        {onPaperBackgroundImageChange ? (
          <>
            <Divider sx={{ my: 1.5 }} />
            <MailPaperBackgroundPickerContent
              selectedImageKey={paperBackgroundImage}
              onSelect={onPaperBackgroundImageChange}
              disabled={disabled}
              enabled={Boolean(anchorEl)}
            />
          </>
        ) : null}
      </Menu>
    </>
  );
}
