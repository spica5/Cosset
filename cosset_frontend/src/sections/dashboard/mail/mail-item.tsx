import type { IMail } from 'src/types/mail';
import type { ListItemButtonProps } from '@mui/material/ListItemButton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { fToNow } from 'src/utils/format-time';

import { Iconify } from 'src/components/dashboard/iconify';

import { MailAvatar } from './mail-avatar';
import { getMailMessageSnippet } from './mail-compose-utils';

// ----------------------------------------------------------------------

type Props = ListItemButtonProps & {
  mail: IMail;
  selected: boolean;
};

export function MailItem({ mail, selected, sx, ...other }: Props) {
  const snippet = getMailMessageSnippet(mail.message);

  return (
    <Box component="li" sx={{ display: 'flex' }}>
      <ListItemButton
        disableGutters
        sx={{
          px: 1,
          py: 1.25,
          gap: 1.25,
          borderRadius: 1,
          alignItems: 'flex-start',
          ...(selected && { bgcolor: 'action.selected' }),
          ...sx,
        }}
        {...other}
      >
        <Box
          sx={{
            width: 10,
            pt: 1.5,
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {mail.isUnread ? (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'info.main',
              }}
            />
          ) : null}
        </Box>

        <MailAvatar
          name={mail.from.name}
          photoKeyOrUrl={mail.from.avatarUrl}
          sx={{ width: 40, height: 40, flexShrink: 0 }}
        />

        <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              noWrap
              variant="subtitle2"
              sx={{
                flex: 1,
                fontWeight: mail.isUnread ? 700 : 600,
              }}
            >
              {mail.from.name}
            </Typography>
            <Typography noWrap variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
              {fToNow(mail.createdAt)}
            </Typography>
          </Stack>

          <Typography
            noWrap
            variant="body2"
            sx={{
              fontWeight: mail.isUnread ? 600 : 400,
              color: mail.isUnread ? 'text.primary' : 'text.secondary',
            }}
          >
            {mail.subject?.trim() || '(No subject)'}
          </Typography>

          {snippet ? (
            <Typography noWrap variant="caption" sx={{ color: 'text.disabled' }}>
              {snippet}
            </Typography>
          ) : null}
        </Stack>

        <Stack alignItems="center" justifyContent="center" sx={{ pt: 0.5, flexShrink: 0 }}>
          <Iconify
            icon={mail.isStarred ? 'eva:star-fill' : 'eva:star-outline'}
            width={18}
            sx={{ color: mail.isStarred ? 'warning.main' : 'text.disabled' }}
          />
        </Stack>
      </ListItemButton>
    </Box>
  );
}
