import type { StackProps } from '@mui/material/Stack';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

type Props = StackProps & {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenNav: () => void;
  onOpenMail?: () => void;
  hideSearch?: boolean;
};

export function MailHeader({
  searchQuery,
  onSearchChange,
  onOpenNav,
  onOpenMail,
  hideSearch = false,
  sx,
  ...other
}: Props) {
  return (
    <Stack direction="row" alignItems="center" sx={{ py: 1, mb: 1, ...sx }} {...other}>
      <IconButton onClick={onOpenNav}>
        <Iconify icon="fluent:mail-24-filled" />
      </IconButton>

      {onOpenMail && (
        <IconButton onClick={onOpenMail}>
          <Iconify icon="solar:chat-round-dots-bold" />
        </IconButton>
      )}

      {!hideSearch && (
        <TextField
          fullWidth
          size="small"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search mail..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  aria-label="Clear search"
                  onClick={() => onSearchChange('')}
                >
                  <Iconify icon="mingcute:close-line" width={16} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
          sx={{ ml: 2 }}
        />
      )}
    </Stack>
  );
}
