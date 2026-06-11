import type { StackProps } from '@mui/material/Stack';

import Stack from '@mui/material/Stack';

import type { MailLayoutMode } from './mail-layout-mode';

// ----------------------------------------------------------------------

type Props = StackProps & {
  layoutMode: MailLayoutMode;
  slots: {
    topBar?: React.ReactNode;
    header: React.ReactNode;
    nav: React.ReactNode;
    navHorizontal?: React.ReactNode;
    list: React.ReactNode;
    details: React.ReactNode;
  };
};

export function Layout({ layoutMode, slots, sx, ...other }: Props) {
  const isHorizontal = layoutMode === 'horizontal';

  if (isHorizontal) {
    return (
      <Stack sx={{ flex: '1 1 auto', overflow: 'hidden', minHeight: 0, ...sx }} {...other}>
        {slots.topBar}

        <Stack
          sx={{
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: 'background.neutral',
          }}
        >
          {slots.header}

          <Stack sx={{ display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
            {slots.navHorizontal}
          </Stack>

          <Stack
            direction="row"
            sx={{
              flex: '1 1 auto',
              minHeight: 0,
              overflow: 'hidden',
              gap: 1.5,
              p: { md: 1.5 },
              pt: { md: 1 },
            }}
          >
            <Stack
              sx={{
                flex: { md: '0 0 360px' },
                minHeight: 0,
                overflow: 'hidden',
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: (theme) => theme.customShadows?.z1,
                display: { xs: 'none', md: 'flex' },
              }}
            >
              {slots.list}
            </Stack>

            <Stack
              sx={{
                minWidth: 0,
                flex: '1 1 auto',
                minHeight: 0,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: (theme) => theme.customShadows?.z1,
              }}
            >
              {slots.details}
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', ...sx }} {...other}>
      {slots.topBar}
      {slots.header}

      <Stack
        direction="row"
        spacing={1}
        sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', px: { md: 0.5 }, pb: 0.5 }}
      >
        <Stack
          sx={{
            flex: '0 0 200px',
            minHeight: 0,
            overflow: 'hidden',
            display: { xs: 'none', md: 'flex' },
          }}
        >
          {slots.nav}
        </Stack>

        <Stack
          sx={{
            borderRadius: 2,
            flex: '0 0 320px',
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows?.z1,
            display: { xs: 'none', md: 'flex' },
          }}
        >
          {slots.list}
        </Stack>

        <Stack
          sx={{
            minWidth: 0,
            flex: '1 1 auto',
            minHeight: 0,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows?.z1,
          }}
        >
          {slots.details}
        </Stack>
      </Stack>
    </Stack>
  );
}
