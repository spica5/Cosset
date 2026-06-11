import type { IMailLabel } from 'src/types/mail';
import type { ListItemButtonProps } from '@mui/material/ListItemButton';

import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';

import { Iconify } from 'src/components/dashboard/iconify';

import { MAIL_LABEL_ICONS } from './mail-label-icons';

// ----------------------------------------------------------------------

type Props = ListItemButtonProps & {
  selected: boolean;
  label: IMailLabel;
  onClickNavItem: () => void;
};

export function MailNavItem({ selected, label, onClickNavItem, ...other }: Props) {
  const labelIcon = MAIL_LABEL_ICONS[label.id];

  return (
    <Box component="li" sx={{ display: 'flex' }}>
      <ListItemButton
        disableGutters
        onClick={onClickNavItem}
        sx={{
          pl: 1,
          pr: 1.5,
          gap: 2,
          borderRadius: 0.75,
          color: 'text.secondary',
          ...(selected && { color: 'text.primary' }),
        }}
        {...other}
      >
        <Iconify icon={labelIcon} width={22} sx={{ color: label.color }} />

        <Box
          component="span"
          sx={{
            flexGrow: 1,
            textTransform: 'capitalize',
            typography: selected ? 'subtitle2' : 'body2',
          }}
        >
          {label.name}
        </Box>

        {!!label.unreadCount && (
          <Box component="span" sx={{ typography: 'caption' }}>
            {label.unreadCount}
          </Box>
        )}
      </ListItemButton>
    </Box>
  );
}
