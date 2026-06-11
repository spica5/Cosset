'use client';

import { useRef, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/dashboard/iconify';

import type { MailLayoutMode } from './mail-layout-mode';

// ----------------------------------------------------------------------

type Props = {
  layoutMode: MailLayoutMode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleLayout: () => void;
  onToggleCompose: () => void;
  onSetLayoutMode?: (mode: MailLayoutMode) => void;
};

export function MailTopBar({
  layoutMode,
  searchQuery,
  onSearchChange,
  onToggleLayout,
  onToggleCompose,
  onSetLayoutMode,
}: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleLayoutChange = (_: React.MouseEvent<HTMLElement>, value: MailLayoutMode | null) => {
    if (!value) {
      return;
    }

    if (onSetLayoutMode) {
      onSetLayoutMode(value);
      return;
    }

    if (value !== layoutMode) {
      onToggleLayout();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'center' }}
      spacing={{ xs: 1.5, md: 2 }}
      sx={{
        px: { xs: 1.5, md: 2 },
        py: 1.5,
        flexShrink: 0,
        bgcolor: 'background.default',
        borderBottom: (theme) => `1px solid ${theme.vars.palette.divider}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: { md: 120 } }}>
        <Iconify icon="fluent:mail-24-filled" width={28} sx={{ color: 'primary.main' }} />
        <Typography variant="h5">Mail</Typography>
      </Stack>

      <TextField
        fullWidth
        size="small"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        inputRef={searchInputRef}
        placeholder="Search mail..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {searchQuery ? (
                <IconButton
                  size="small"
                  edge="end"
                  aria-label="Clear search"
                  onClick={() => onSearchChange('')}
                >
                  <Iconify icon="mingcute:close-line" width={16} />
                </IconButton>
              ) : (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', display: { xs: 'none', md: 'block' } }}
                >
                  ⌘ K
                </Typography>
              )}
            </InputAdornment>
          ),
        }}
        sx={{ maxWidth: { md: 1 } }}
      />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:pen-bold" />}
          onClick={onToggleCompose}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Compose
        </Button>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={layoutMode}
          onChange={handleLayoutChange}
          aria-label="Mail layout"
        >
          <ToggleButton value="horizontal" aria-label="Horizontal layout">
            <Tooltip title="Horizontal layout">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Iconify icon="solar:widget-horizontal-bold" width={18} />
                <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Tabs
                </Typography>
              </Stack>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="sidebar" aria-label="Sidebar layout">
            <Tooltip title="Sidebar layout">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Iconify icon="solar:sidebar-minimalistic-bold" width={18} />
                <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Sidebar
                </Typography>
              </Stack>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  );
}
