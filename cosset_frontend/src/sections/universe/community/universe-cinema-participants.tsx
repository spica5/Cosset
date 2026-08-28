'use client';

import type { CinemaChatParticipant } from 'src/types/cinema-chat';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { useGetFriends } from 'src/actions/friend';

import { useAuthContext } from 'src/auth/hooks';

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
  selectedPrivateReceiverId?: string | null;
  onSelectPrivateReceiver?: (participant: CinemaChatParticipant | null) => void;
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

type AudienceItemProps = {
  participant: CinemaChatParticipant;
  userIdStr?: string;
  friendIdSet: Set<string>;
  selectedPrivateReceiverId?: string | null;
  onSelectPrivateReceiver?: (participant: CinemaChatParticipant | null) => void;
};

function AudienceItem({
  participant: p,
  userIdStr,
  friendIdSet,
  selectedPrivateReceiverId,
  onSelectPrivateReceiver,
}: AudienceItemProps) {
  const joinTimeStr = formatJoinTime(p.joinedAt);
  const participantKey = p.userId.trim().toLowerCase();
  const isSelf =
    Boolean(userIdStr) && participantKey === String(userIdStr).trim().toLowerCase();
  const isFriend = friendIdSet.has(participantKey);
  const isSelected =
    Boolean(selectedPrivateReceiverId) &&
    participantKey === String(selectedPrivateReceiverId).trim().toLowerCase();
  const canPrivateChat = Boolean(onSelectPrivateReceiver && isFriend && !isSelf && !p.leftAt);

  const tooltipTitle = `${p.name}${isFriend ? ' · Friend' : ''}${
    joinTimeStr ? ` · Joined ${joinTimeStr}` : ''
  }${canPrivateChat ? ' · Tap for private chat' : ''}`;

  return (
    <Tooltip title={tooltipTitle} placement="left">
      <Box
        role={canPrivateChat ? 'button' : undefined}
        tabIndex={canPrivateChat ? 0 : undefined}
        onClick={() => {
          if (!canPrivateChat || !onSelectPrivateReceiver) {
            return;
          }
          onSelectPrivateReceiver(isSelected ? null : p);
        }}
        onKeyDown={(event) => {
          if (!canPrivateChat || !onSelectPrivateReceiver) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectPrivateReceiver(isSelected ? null : p);
          }
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          p: 0,
          m: 0,
          boxSizing: 'border-box',
          borderRadius: '50%',
          border: '2px solid',
          borderColor: isSelected ? CINEMA_GOLD : 'transparent',
          bgcolor: 'transparent',
          cursor: canPrivateChat ? 'pointer' : 'default',
          lineHeight: 0,
        }}
      >
        <CoffeeShopChatAvatar
          photoKeyOrUrl={p.photoURL}
          name={p.name}
          size={48}
          showTooltip={false}
          status={!p.leftAt ? 'online' : 'left'}
          isFriend={isFriend && !isSelf}
          isCurrentUser={isSelf}
        />
      </Box>
    </Tooltip>
  );
}

export function UniverseCinemaParticipants({
  participants,
  selectedPrivateReceiverId = null,
  onSelectPrivateReceiver,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const { user } = useAuthContext();
  const userIdStr = user?.id != null ? String(user.id) : undefined;
  const { friends: acceptedFriends } = useGetFriends(userIdStr, 'accepted', Boolean(userIdStr));

  const friendIdSet = useMemo(() => {
    const set = new Set<string>();
    const current = userIdStr?.trim().toLowerCase() || '';
    (acceptedFriends || []).forEach((friend) => {
      const a = String(friend.userId1 || '')
        .trim()
        .toLowerCase();
      const b = String(friend.userId2 || '')
        .trim()
        .toLowerCase();
      if (!a || !b || !current) {
        return;
      }
      if (a === current) {
        set.add(b);
      } else if (b === current) {
        set.add(a);
      }
    });
    return set;
  }, [acceptedFriends, userIdStr]);

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

            {visibleParticipants.map((p) => (
              <AudienceItem
                key={p.userId}
                participant={p}
                userIdStr={userIdStr}
                friendIdSet={friendIdSet}
                selectedPrivateReceiverId={selectedPrivateReceiverId}
                onSelectPrivateReceiver={onSelectPrivateReceiver}
              />
            ))}
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
