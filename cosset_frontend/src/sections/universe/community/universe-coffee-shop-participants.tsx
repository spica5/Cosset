'use client';

import type { CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { useGetFriends } from 'src/actions/friend';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { CoffeeShopChatAvatar } from 'src/sections/universe/community/coffee-shop-chat-avatar';
import { Iconify } from 'src/components/universe/iconify';

import {
  COFFEE_SHOP_MOBILE_DOCK,
  coffeeShopLeftDockPanelSx,
  coffeeShopMobileFabSx,
  getCoffeeShopParticipantsDockBottom,
} from './coffee-shop-mobile-panels';

// ----------------------------------------------------------------------

type Props = {
  participants: CoffeeShopChatParticipant[];
  selectedPrivateReceiverId?: string | null;
  onSelectPrivateReceiver?: (participant: CoffeeShopChatParticipant) => void;
  stackAboveBackground?: boolean;
};

const THIRTY_MIN = 30 * 60 * 1000;

const formatJoinTime = (joinedAtStr?: string): string => {
  if (!joinedAtStr) return '';

  const normalized = joinedAtStr
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+$/, '$1');

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

type ParticipantItemProps = {
  participant: CoffeeShopChatParticipant;
  userIdStr?: string;
  friendIdSet: Set<string>;
  selectedPrivateReceiverId?: string | null;
  onSelectPrivateReceiver?: (participant: CoffeeShopChatParticipant) => void;
  showJoinTime?: boolean;
};

function ParticipantItem({
  participant: p,
  userIdStr,
  friendIdSet,
  selectedPrivateReceiverId,
  onSelectPrivateReceiver,
  showJoinTime = false,
}: ParticipantItemProps) {
  const isFriend =
    typeof p.userId === 'string' && userIdStr
      ? friendIdSet.has(p.userId.trim().toLowerCase())
      : false;

  const isCurrentUser =
    typeof p.userId === 'string' && userIdStr
      ? p.userId.trim().toLowerCase() === userIdStr.toLowerCase()
      : false;

  const isSelectedReceiver =
    typeof p.userId === 'string' && selectedPrivateReceiverId
      ? p.userId.trim().toLowerCase() === selectedPrivateReceiverId.toLowerCase()
      : false;

  const canSelectForPrivate = Boolean(onSelectPrivateReceiver && isFriend && !isCurrentUser && !p.leftAt);
  const joinTimeStr = formatJoinTime(p.joinedAt);
  const tooltipTitle = `${p.name}${joinTimeStr ? ` • Joined ${joinTimeStr}` : ''}`;

  return (
    <Tooltip title={tooltipTitle} placement="left">
      <Stack
        alignItems="center"
        spacing={0.5}
        role={canSelectForPrivate ? 'button' : undefined}
        tabIndex={canSelectForPrivate ? 0 : undefined}
        onClick={() => {
          if (canSelectForPrivate) {
            onSelectPrivateReceiver?.(p);
          }
        }}
        onKeyDown={(e) => {
          if (canSelectForPrivate && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelectPrivateReceiver?.(p);
          }
        }}
        sx={{
          cursor: canSelectForPrivate ? 'pointer' : 'default',
          borderRadius: 1.5,
          boxSizing: 'border-box',
          border: '2px solid',
          borderColor: isSelectedReceiver ? 'rgba(255, 100, 100, 0.8)' : 'transparent',
          p: 0.5,
        }}
      >
        <CoffeeShopChatAvatar
          photoKeyOrUrl={p.photoURL}
          name={p.name}
          size={40}
          showTooltip={false}
          status={!p.leftAt ? 'online' : 'left'}
          isFriend={isFriend}
          isCurrentUser={isCurrentUser}
        />
        {showJoinTime && joinTimeStr ? (
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '10px',
              lineHeight: 1,
            }}
          >
            {joinTimeStr}
          </Typography>
        ) : null}
      </Stack>
    </Tooltip>
  );
}

export function UniverseCoffeeShopParticipants({
  participants,
  selectedPrivateReceiverId,
  onSelectPrivateReceiver,
  stackAboveBackground = false,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const { user } = useAuthContext();
  const userIdStr = user?.id != null ? String(user.id) : undefined;
  const { friends: acceptedFriends } = useGetFriends(userIdStr, 'accepted', Boolean(userIdStr));

  const friendIdSet = useMemo(() => {
    const s = new Set<string>();
    const validFriends = (acceptedFriends || []).filter((f) => {
      const a = (f.userId1 || '').trim();
      const b = (f.userId2 || '').trim();
      return a && b;
    });
    validFriends.forEach((f) => {
      const a = (f.userId1 || '').trim();
      const b = (f.userId2 || '').trim();
      if (userIdStr && a.toLowerCase() === userIdStr.toLowerCase()) {
        s.add(b.toLowerCase());
      } else if (userIdStr && b.toLowerCase() === userIdStr.toLowerCase()) {
        s.add(a.toLowerCase());
      }
    });
    return s;
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
        bottom: getCoffeeShopParticipantsDockBottom(stackAboveBackground),
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
              Visitors
            </Typography>

            {visibleParticipants.map((p) => (
              <ParticipantItem
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
            aria-label={open ? 'Hide participants' : 'Show participants'}
            aria-pressed={open}
            sx={{
              ...coffeeShopMobileFabSx,
              ...(open
                ? {
                    border: '2px solid',
                    borderColor: 'info.main',
                  }
                : undefined),
            }}
          >
            <Iconify icon="solar:users-group-rounded-bold" width={26} />
          </IconButton>

          {!open ? (
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 20,
                height: 20,
                px: 0.5,
                borderRadius: 10,
                bgcolor: 'info.main',
                color: 'common.white',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(15, 20, 28, 0.88)',
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
