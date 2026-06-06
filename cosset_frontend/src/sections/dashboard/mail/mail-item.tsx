import type { IMail } from 'src/types/mail';
import type { ListItemButtonProps } from '@mui/material/ListItemButton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';

import { fToNow } from 'src/utils/format-time';

import { MailAvatar } from './mail-avatar';

// ----------------------------------------------------------------------

type Props = ListItemButtonProps & {
  mail: IMail;
  selected: boolean;
};

export function MailItem({ mail, selected, sx, ...other }: Props) {
  return (
    <Box component="li" sx={{ display: 'flex' }}>
      <ListItemButton
        disableGutters
        sx={{
          p: 1,
          gap: 2,
          borderRadius: 1,
          ...(selected && { bgcolor: 'action.selected' }),
          ...sx,
        }}
        {...other}
      >
        <MailAvatar
          name={mail.from.name}
          photoKeyOrUrl={mail.from.avatarUrl}
          sx={{ width: 40, height: 40 }}
        />

        <ListItemText
          primary={mail.subject?.trim() || '(No subject)'}
          secondary={mail.from.name}
          primaryTypographyProps={{
            noWrap: true,
            component: 'span',
            variant: mail.isUnread ? 'subtitle2' : 'body2',
            fontWeight: mail.isUnread ? 600 : 400,
          }}
          secondaryTypographyProps={{
            noWrap: true,
            component: 'span',
            variant: 'caption',
            color: 'text.secondary',
          }}
        />

        <Stack alignItems="flex-end" sx={{ alignSelf: 'stretch' }}>
          <Typography
            noWrap
            variant="body2"
            component="span"
            sx={{ mb: 1.5, fontSize: 12, color: 'text.disabled' }}
          >
            {fToNow(mail.createdAt)}
          </Typography>

          {!!mail.isUnread && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'info.main',
              }}
            />
          )}
        </Stack>
      </ListItemButton>
    </Box>
  );
}
