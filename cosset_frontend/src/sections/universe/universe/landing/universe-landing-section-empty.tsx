import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = {
  icon?: string;
  title: string;
  comment: string;
  actionHref?: string;
  actionLabel?: string;
  accentColor?: string;
};

/**
 * Empty-state guidance shown on Home Space sections for first login / empty content.
 */
export function UniverseLandingSectionEmpty({
  icon = 'solar:info-circle-bold',
  title,
  comment,
  actionHref,
  actionLabel,
  accentColor,
}: Props) {
  return (
    <Stack
      spacing={1.25}
      alignItems="center"
      sx={{
        py: { xs: 4, md: 5 },
        px: 2,
        textAlign: 'center',
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: accentColor ? `${accentColor}22` : 'action.selected',
          color: accentColor || 'text.secondary',
        }}
      >
        <Iconify icon={icon} width={26} />
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 420, lineHeight: 1.6 }}
      >
        {comment}
      </Typography>

      {actionHref && actionLabel ? (
        <Button
          component={RouterLink}
          href={actionHref}
          size="small"
          variant="soft"
          color="primary"
          startIcon={<Iconify icon="mingcute:add-line" width={16} />}
          sx={{ mt: 0.5, borderRadius: 99 }}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
