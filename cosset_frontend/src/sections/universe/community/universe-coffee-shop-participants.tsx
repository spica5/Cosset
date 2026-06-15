'use client';

import type { CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { useGetFriends } from 'src/actions/friend';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { CoffeeShopChatAvatar } from 'src/sections/universe/community/coffee-shop-chat-avatar';

// ----------------------------------------------------------------------

type Props = {
  participants: CoffeeShopChatParticipant[];
  selectedPrivateReceiverId?: string | null;
  onSelectPrivateReceiver?: (participant: CoffeeShopChatParticipant) => void;
};

const formatJoinTime = (joinedAtStr?: string): string => {
  if (!joinedAtStr) return '';

  const normalized = joinedAtStr
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+$/, '$1');

  // Add Z because DB time is UTC
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

export function UniverseCoffeeShopParticipants({
  participants,
  selectedPrivateReceiverId,
  onSelectPrivateReceiver,
}: Props) {

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

  const THIRTY_MIN = 30 * 60 * 1000;

  if (!participants?.length) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 8, sm: 24 },
        top: { xs: 85, sm: '35%' },
        bottom: { xs: 'auto', sm: 'auto' },
        left: { xs: 8, sm: 'auto' },
        transform: { xs: 'none', sm: 'translateY(-50%)' },
        zIndex: 7,
        pointerEvents: 'auto',
        maxWidth: { xs: 'calc(100vw - 16px)', sm: 'none' },
      }}
    >
      <Stack
        direction={{ xs: 'row', sm: 'column' }}
        spacing={{ xs: 1, sm: 1.25 }}
        alignItems="center"
        sx={{
          py: { xs: 1, sm: 1.5 },
          px: { xs: 1, sm: 1 },
          borderRadius: 2,
          bgcolor: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          maxHeight: { xs: 72, sm: 'min(50vh, 420px)' },
          overflowX: { xs: 'auto', sm: 'hidden' },
          overflowY: { xs: 'hidden', sm: 'auto' },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.55)',
            px: 0.5,
            textAlign: 'center',
            lineHeight: 1.2,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          Here today
        </Typography>
        {participants
          .map((p) => {
            if (p.leftAt) {
              const normalized = p.leftAt.replace(' ', 'T').replace(/(\.\d{3})\d+$/, '$1');
              const leftTs = new Date(`${normalized}Z`).getTime();

              if (!Number.isNaN(leftTs) && Date.now() - leftTs > THIRTY_MIN) {
                return null;
              }
            }

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
              <Tooltip key={p.userId} title={tooltipTitle} placement="left">
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
                    borderColor: isSelectedReceiver
                      ? 'rgba(255, 100, 100, 0.8)'
                      : 'transparent',
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
                  {joinTimeStr && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '10px',
                        lineHeight: 1,
                        display: { xs: 'none', sm: 'block' },
                      }}
                    >
                      {joinTimeStr}
                    </Typography>
                  )}
                </Stack>
              </Tooltip>
            );
          })
          .filter(Boolean)}
      </Stack>
    </Box>
  );
}
