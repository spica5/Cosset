import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Menu from '@mui/material/Menu';
import ButtonBase from '@mui/material/ButtonBase';

import { varAlpha } from 'src/theme/dashboard/styles';
import { MAIL_INK_COLORS } from 'src/constants/mail-writing-fonts';

import { Iconify } from '../../iconify';

import type { EditorToolbarProps } from '../types';

// ----------------------------------------------------------------------

export function TextColorBlock({ editor }: Pick<EditorToolbarProps, 'editor'>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!editor) {
    return null;
  }

  const currentColor = (editor.getAttributes('textStyle').color as string | undefined) || '#1a1a1a';

  const handleSelect = (value: string) => {
    editor.chain().focus().setColor(value).run();
    setAnchorEl(null);
  };

  return (
    <>
      <ButtonBase
        aria-label="Ink color"
        aria-controls={anchorEl ? 'text-color-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={anchorEl ? 'true' : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          px: 0.75,
          width: 36,
          height: 32,
          borderRadius: 0.75,
          border: (theme) => `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
        }}
      >
        <Stack alignItems="center" spacing={0.25}>
          <Iconify icon="solar:pen-bold" width={16} />
          <Box sx={{ width: 18, height: 3, borderRadius: 1, bgcolor: currentColor }} />
        </Stack>
      </ButtonBase>

      <Menu
        id="text-color-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: { mt: 0.5, p: 1 },
          },
        }}
      >
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {MAIL_INK_COLORS.map((color) => (
            <ButtonBase
              key={color.value}
              aria-label={color.label}
              onClick={() => handleSelect(color.value)}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: color.value,
                border: (theme) =>
                  currentColor === color.value
                    ? `2px solid ${theme.vars.palette.primary.main}`
                    : `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.3)}`,
              }}
            />
          ))}
        </Stack>
      </Menu>
    </>
  );
}
