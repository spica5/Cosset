'use client';

import type { CinemaChatParticipant } from 'src/types/cinema-chat';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/universe/iconify';
import { CoffeeShopChatAvatar } from 'src/sections/universe/community/coffee-shop-chat-avatar';

import { CINEMA_GOLD, cinemaMobileFabSx } from 'src/sections/dashboard/cinema/cinema-theater-theme';

import {
  COFFEE_SHOP_MOBILE_DOCK,
  coffeeShopLeftDockPanelSx,
} from './coffee-shop-mobile-panels';

// ----------------------------------------------------------------------

type Props = {
  participants: CinemaChatParticipant[];
};

const THIRTY_MIN = 30 * 60 * 1000;

const formatJoinTime = (joinedAtStr?: string): string => {
  if (!joinedAtStr) return '';

  const normalized = joinedAtStr.replace(' ', 'T').replace(/(\.\d{3})\d+$/, '$1');
  const joinedAt = new Date(`${normalized}Z`);

  if (Number.isNaN(joinedAt.getTime())) {
    return '';
  }

  return joinedAt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export function UniverseCinemaParticipants({ participants }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const visibleParticipants = useMemo(
    () =>
      participants.filter((p) => {
        if (!p.leftAt) {
          return true;
        }

        const normalized = p.leftAt.replace(' ', 'T').replace(/(\.\d{3})\d+$/, '$1');
        const leftTs = new Date(`${normalized}Z`).getTime();

        return !Number.isNaN(leftTs) && Date.now() - leftTs <= THIRTY_MIN;
      }),
    [participants],
  );

  if (!visibleParticipants.length) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        left: COFFEE_SHOP_MOBILE_DOCK.left,
        bottom: COFFEE_SHOP_MOBILE_DOCK.bottom,
        zIndex: theme.zIndex.snackbar,
        pointerEvents: 'auto',
      }}
    >
      <Stack direction="column" alignItems="flex-start" spacing={1}>
        {open ? (
          <Stack spacing={1} sx={coffeeShopLeftDockPanelSx}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.55)',
                px: 0.5,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              Audience
            </Typography>

            {visibleParticipants.map((p) => {
              const joinTimeStr = formatJoinTime(p.joinedAt);
              const tooltipTitle = `${p.name}${joinTimeStr ? ` • Joined ${joinTimeStr}` : ''}`;

              return (
                <Tooltip key={p.userId} title={tooltipTitle} placement="left">
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <CoffeeShopChatAvatar
                      photoKeyOrUrl={p.photoURL}
                      name={p.name}
                      size={48}
                      showTooltip={false}
                      status={!p.leftAt ? 'online' : 'left'}
                    />
                  </Box>
                </Tooltip>
              );
            })}
          </Stack>
        ) : null}

        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Hide audience' : 'Show audience'}
            aria-pressed={open}
            sx={{
              ...cinemaMobileFabSx,
              ...(open
                ? {
                    border: '2px solid',
                    borderColor: CINEMA_GOLD,
                  }
                : undefined),
            }}
          >
            <Iconify icon="solar:users-group-rounded-bold" width={22} />
          </IconButton>

          {!open ? (
            <Box
              sx={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 18,
                height: 18,
                px: 0.5,
                borderRadius: 10,
                bgcolor: CINEMA_GOLD,
                color: '#0B0705',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(0,0,0,0.55)',
              }}
            >
              {visibleParticipants.length}
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}
