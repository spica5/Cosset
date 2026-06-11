import type { IMails } from 'src/types/mail';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useResponsive } from 'src/hooks/use-responsive';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/dashboard/iconify';
import { Scrollbar } from 'src/components/dashboard/scrollbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { MailItem } from './mail-item';
import { MailItemSkeleton } from './mail-skeleton';

// ----------------------------------------------------------------------

type SortOrder = 'newest' | 'oldest';

type Props = {
  empty: boolean;
  loading: boolean;
  openMail: boolean;
  mails: IMails;
  selectedMailId: string;
  selectedLabelId: string;
  searchQuery?: string;
  hideSearch?: boolean;
  onCloseMail: () => void;
  onClickMail: (id: string) => void;
  onSearchChange?: (value: string) => void;
};

export function MailList({
  empty,
  mails,
  loading,
  openMail,
  onCloseMail,
  onClickMail,
  selectedMailId,
  selectedLabelId,
  searchQuery = '',
  hideSearch = false,
  onSearchChange,
}: Props) {
  const mdUp = useResponsive('up', 'md');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const sortedMailIds =
    sortOrder === 'newest'
      ? mails.allIds
      : [...mails.allIds].reverse();

  const renderLoading = (
    <Stack sx={{ px: 2, flex: '1 1 auto' }}>
      <MailItemSkeleton />
    </Stack>
  );

  const trimmedSearch = searchQuery.trim();

  const renderEmpty = (
    <Stack sx={{ px: 2, flex: '1 1 auto' }}>
      <EmptyContent
        title={trimmedSearch ? 'No results found' : `Nothing in ${selectedLabelId}`}
        description={
          trimmedSearch
            ? `No mail matched "${trimmedSearch}" in this folder`
            : 'This folder is empty'
        }
        imgUrl={`${CONFIG.dashboard.assetsDir}/assets/icons/empty/ic-folder-empty.svg`}
      />
    </Stack>
  );

  const renderList = (
    <Scrollbar sx={{ flex: '1 1 0' }}>
      <nav>
        <Box
          component="ul"
          sx={{
            px: 2,
            pb: 1,
            gap: 0.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {sortedMailIds.map((mailId) => (
            <MailItem
              key={mailId}
              mail={mails.byId[mailId]}
              selected={selectedMailId === mailId}
              onClick={() => {
                onClickMail(mailId);
              }}
            />
          ))}
        </Box>
      </nav>
    </Scrollbar>
  );

  const renderToolbar = (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pb: 1 }}>
      <TextField
        select
        size="small"
        value={sortOrder}
        onChange={(event) => setSortOrder(event.target.value as SortOrder)}
        variant="standard"
        sx={{ minWidth: 130 }}
        InputProps={{ disableUnderline: true }}
      >
        <MenuItem value="newest">Newest first</MenuItem>
        <MenuItem value="oldest">Oldest first</MenuItem>
      </TextField>

      <Stack direction="row" spacing={0.5}>
        <IconButton size="small" aria-label="Sort">
          <Iconify icon="solar:sort-vertical-bold" width={20} />
        </IconButton>
        <IconButton size="small" aria-label="Filter">
          <Iconify icon="solar:filter-bold" width={20} />
        </IconButton>
      </Stack>
    </Stack>
  );

  const renderContent = (
    <>
      {!hideSearch && mdUp ? (
        <Stack sx={{ p: 2, pb: 1 }}>
          <TextField
            value={searchQuery}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Search mail..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: trimmedSearch ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Clear search"
                    onClick={() => onSearchChange?.('')}
                  >
                    <Iconify icon="mingcute:close-line" width={16} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />
        </Stack>
      ) : null}

      {hideSearch && mdUp ? (
        <Stack sx={{ pt: 1.5, flexShrink: 0 }}>
          {renderToolbar}
        </Stack>
      ) : null}

      {loading ? renderLoading : <>{empty ? renderEmpty : renderList}</>}
    </>
  );

  return (
    <>
      <Stack sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
        {renderContent}
      </Stack>

      <Drawer
        open={openMail}
        onClose={onCloseMail}
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 320 } }}
      >
        {renderContent}
      </Drawer>
    </>
  );
}
