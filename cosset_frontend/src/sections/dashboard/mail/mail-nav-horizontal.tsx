'use client';

import type { IMailLabel } from 'src/types/mail';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { varAlpha } from 'src/theme/dashboard/styles';

import { Iconify } from 'src/components/dashboard/iconify';
import { Scrollbar } from 'src/components/dashboard/scrollbar';

import { MAIL_LABEL_ICONS } from './mail-label-icons';

// ----------------------------------------------------------------------

type Props = {
  labels: IMailLabel[];
  selectedLabelId: string;
  onSelectLabel: (labelId: string) => void;
};

export function MailNavHorizontal({ labels, selectedLabelId, onSelectLabel }: Props) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        borderBottom: (theme) => `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
        bgcolor: 'background.default',
      }}
    >
      <Scrollbar sx={{ maxWidth: 1 }}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            px: 1.5,
            py: 0.75,
            minHeight: 48,
            alignItems: 'stretch',
          }}
        >
          {labels.map((label) => {
            const selected = selectedLabelId === label.id;
            const icon = MAIL_LABEL_ICONS[label.id];

            return (
              <ButtonBase
                key={label.id}
                onClick={() => onSelectLabel(label.id)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  gap: 0.75,
                  flexShrink: 0,
                  borderRadius: 1,
                  color: selected ? 'primary.main' : 'text.secondary',
                  borderBottom: (theme) =>
                    selected ? `2px solid ${theme.vars.palette.primary.main}` : '2px solid transparent',
                  '&:hover': {
                    bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                  },
                }}
              >
                {icon ? <Iconify icon={icon} width={20} sx={{ color: selected ? 'primary.main' : label.color }} /> : null}
                <Typography
                  variant="body2"
                  sx={{
                    textTransform: 'capitalize',
                    fontWeight: selected ? 600 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label.name}
                </Typography>
                {!!label.unreadCount && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', ml: 0.25 }}>
                    {label.unreadCount}
                  </Typography>
                )}
              </ButtonBase>
            );
          })}
        </Stack>
      </Scrollbar>
    </Box>
  );
}
