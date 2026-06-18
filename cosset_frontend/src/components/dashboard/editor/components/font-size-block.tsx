import { useState } from 'react';

import Menu from '@mui/material/Menu';
import { listClasses } from '@mui/material/List';
import ButtonBase, { buttonBaseClasses } from '@mui/material/ButtonBase';

import { varAlpha } from 'src/theme/dashboard/styles';
import { MAIL_FONT_SIZES } from 'src/constants/mail-writing-fonts';

import { Iconify } from '../../iconify';

import type { EditorToolbarProps } from '../types';

// ----------------------------------------------------------------------

export function FontSizeBlock({ editor }: Pick<EditorToolbarProps, 'editor'>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!editor) {
    return null;
  }

  const currentFontSize = editor.getAttributes('textStyle').fontSize as string | undefined;
  const currentLabel =
    MAIL_FONT_SIZES.find((size) => size.value === (currentFontSize || ''))?.label ?? 'Size';

  const handleSelect = (value: string) => {
    if (!value) {
      editor.chain().focus().unsetFontSize().run();
    } else {
      editor.chain().focus().setFontSize(value).run();
    }
    setAnchorEl(null);
  };

  return (
    <>
      <ButtonBase
        aria-label="Font size"
        aria-controls={anchorEl ? 'font-size-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={anchorEl ? 'true' : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          px: 1,
          minWidth: 72,
          height: 32,
          borderRadius: 0.75,
          typography: 'body2',
          justifyContent: 'space-between',
          border: (theme) => `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
        }}
      >
        {currentLabel}
        <Iconify
          width={16}
          icon={anchorEl ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
        />
      </ButtonBase>

      <Menu
        id="font-size-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              maxHeight: 320,
              [`& .${listClasses.root}`]: { py: 0.5 },
            },
          },
        }}
      >
        {MAIL_FONT_SIZES.map((size) => (
          <ButtonBase
            key={size.label}
            onClick={() => handleSelect(size.value)}
            sx={{
              px: 1.5,
              py: 1,
              width: 1,
              display: 'flex',
              justifyContent: 'flex-start',
              typography: 'body2',
              fontSize: size.value || undefined,
              color:
                (currentFontSize || '') === size.value ? 'primary.main' : 'text.primary',
              [`&.${buttonBaseClasses.root}:hover`]: {
                bgcolor: 'action.hover',
              },
            }}
          >
            {size.label}
          </ButtonBase>
        ))}
      </Menu>
    </>
  );
}
