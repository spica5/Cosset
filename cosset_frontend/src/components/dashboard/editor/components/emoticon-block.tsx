import { useState, useEffect, useRef, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import ButtonBase from '@mui/material/ButtonBase';

import { varAlpha } from 'src/theme/dashboard/styles';
import { GLOBAL_EMOTICON_OPTIONS } from 'src/constants/emoticons';

import { Iconify } from '../../iconify';

import type { EditorToolbarProps } from '../types';

// ----------------------------------------------------------------------

export function EmoticonBlock({ editor }: Pick<EditorToolbarProps, 'editor'>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = useCallback(() => {
    setAnchorEl((current) => (current ? null : buttonRef.current));
  }, []);

  const insertEmoticon = useCallback(
    (emoticon: string) => {
      editor?.chain().focus().insertContent(emoticon).run();
      setAnchorEl(null);
    },
    [editor]
  );

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!editor.isEditable) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        toggleMenu();
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('keydown', handleKeyDown);
    return () => dom.removeEventListener('keydown', handleKeyDown);
  }, [editor, toggleMenu]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <ButtonBase
        ref={buttonRef}
        aria-label="Insert emoticon"
        aria-controls={anchorEl ? 'emoticon-menu' : undefined}
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
        <Iconify icon="solar:smile-circle-bold" width={18} />
      </ButtonBase>

      <Menu
        id="emoticon-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              p: 1,
              maxWidth: 280,
            },
          },
        }}
      >
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {GLOBAL_EMOTICON_OPTIONS.map((option) => (
            <Button
              key={option.label}
              type="button"
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => insertEmoticon(option.value)}
              sx={{ minWidth: 0, px: 1.1 }}
            >
              {option.value}
            </Button>
          ))}
        </Stack>
      </Menu>
    </>
  );
}
