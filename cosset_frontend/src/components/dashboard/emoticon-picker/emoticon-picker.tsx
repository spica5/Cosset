'use client';

import type { SxProps, Theme } from '@mui/material/styles';
import type { Editor } from '@tiptap/react';

import { useState, useEffect, useRef, useCallback } from 'react';

import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';

import { varAlpha } from 'src/theme/dashboard/styles';
import { GLOBAL_EMOTICON_OPTIONS } from 'src/constants/emoticons';

import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

export function insertTextAtSelection(
  value: string,
  insert: string,
  selectionStart: number | null | undefined,
  selectionEnd: number | null | undefined,
): { nextValue: string; nextCaret: number } {
  const start = typeof selectionStart === 'number' ? selectionStart : value.length;
  const end = typeof selectionEnd === 'number' ? selectionEnd : value.length;
  const nextValue = `${value.slice(0, start)}${insert}${value.slice(end)}`;

  return {
    nextValue,
    nextCaret: start + insert.length,
  };
}

// ----------------------------------------------------------------------

type EmoticonPickerGridProps = {
  onSelect: (emoticon: string) => void;
  buttonSx?: SxProps<Theme>;
};

/** Shared emoticon option grid used by menus and inline panels. */
export function EmoticonPickerGrid({ onSelect, buttonSx }: EmoticonPickerGridProps) {
  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
      {GLOBAL_EMOTICON_OPTIONS.map((option) => (
        <Button
          key={option.label}
          type="button"
          size="small"
          variant="outlined"
          color="inherit"
          aria-label={option.label}
          onClick={() => onSelect(option.value)}
          sx={{ minWidth: 0, px: 1.1, ...(buttonSx as object) }}
        >
          {option.value}
        </Button>
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------------

type EmoticonMenuProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSelect: (emoticon: string) => void;
  menuPlacement?: 'above' | 'below';
};

function EmoticonMenu({
  anchorEl,
  open,
  onClose,
  onSelect,
  menuPlacement = 'below',
}: EmoticonMenuProps) {
  const handleSelect = useCallback(
    (emoticon: string) => {
      onSelect(emoticon);
      onClose();
    },
    [onClose, onSelect]
  );

  return (
    <Menu
      id="emoticon-picker-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={
        menuPlacement === 'above'
          ? { vertical: 'top', horizontal: 'left' }
          : { vertical: 'bottom', horizontal: 'left' }
      }
      transformOrigin={
        menuPlacement === 'above'
          ? { vertical: 'bottom', horizontal: 'left' }
          : { vertical: 'top', horizontal: 'left' }
      }
      slotProps={{
        paper: {
          sx: {
            mt: menuPlacement === 'above' ? -0.5 : 0.5,
            p: 1,
            maxWidth: 280,
          },
        },
      }}
    >
      <EmoticonPickerGrid onSelect={handleSelect} />
    </Menu>
  );
}

// ----------------------------------------------------------------------

type EmoticonPickerButtonProps = {
  onSelect: (emoticon: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  tooltip?: string;
  edge?: 'start' | 'end' | false;
  menuPlacement?: 'above' | 'below';
};

/** Icon-button emoticon picker for chat, notes, blog, posts, etc. */
export function EmoticonPickerButton({
  onSelect,
  disabled,
  size = 'small',
  icon = 'eva:smiling-face-fill',
  tooltip = 'Insert emoticon',
  edge,
  menuPlacement = 'above',
}: EmoticonPickerButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={tooltip}>
        <span>
          <IconButton
            size={size}
            edge={edge}
            disabled={disabled}
            aria-label={tooltip}
            aria-haspopup="true"
            aria-expanded={anchorEl ? 'true' : undefined}
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            <Iconify icon={icon} />
          </IconButton>
        </span>
      </Tooltip>

      <EmoticonMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        onSelect={onSelect}
        menuPlacement={menuPlacement}
      />
    </>
  );
}

// ----------------------------------------------------------------------

type EmoticonBlockProps = {
  editor: Editor | null;
};

/** TipTap editor toolbar emoticon control (Ctrl/Cmd+E). */
export function EmoticonBlock({ editor }: EmoticonBlockProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const insertEmoticon = useCallback(
    (emoticon: string) => {
      editor?.chain().focus().insertContent(emoticon).run();
    },
    [editor]
  );

  const toggleMenu = useCallback(() => {
    setAnchorEl((current) => (current ? null : buttonRef.current));
  }, []);

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
        aria-controls={anchorEl ? 'emoticon-picker-menu' : undefined}
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

      <EmoticonMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        onSelect={insertEmoticon}
        menuPlacement="below"
      />
    </>
  );
}
