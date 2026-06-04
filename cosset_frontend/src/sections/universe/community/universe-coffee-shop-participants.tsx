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
};

const formatJoinTime = (joinedAtStr?: string): string => {
  if (!joinedAtStr) return '';
  
  const joinedAt = new Date(joinedAtStr);
  // const now = new Date();
  // const diffMs = now.getTime() - joinedAt.getTime();
  // const diffMins = Math.floor(diffMs / 60000);
  // const diffHours = Math.floor(diffMs / 3600000);
  
  // if (diffMins < 1) return 'Just now';
  // if (diffMins < 60) return `${diffMins}m ago`;
  // if (diffHours < 24) return `${diffHours}h ago`;
  
  // return joinedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return joinedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, });
};

export function UniverseCoffeeShopParticipants({ participants }: Props) {

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
        right: { xs: 12, sm: 24 },
        top: '35%',
        transform: 'translateY(-50%)',
        zIndex: 7,
        pointerEvents: 'auto',
      }}
    >
      <Stack
        spacing={1.25}
        alignItems="center"
        sx={{
          py: 1.5,
          px: 1,
          borderRadius: 2,
          bgcolor: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          maxHeight: 'min(50vh, 420px)',
          overflowY: 'auto',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.55)',
            px: 0.5,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          Here today
        </Typography>
        {participants
          .map((p) => {
            // if leftAt is set and older than 30min, skip rendering here
            // if (p.leftAt) {
            //   const leftTs = new Date(p.leftAt).getTime();

            //   if (!Number.isNaN(leftTs) && Date.now() - leftTs > THIRTY_MIN) {
            //     return null;
            //   }
            // }

            const isFriend =
              typeof p.userId === 'string' && userIdStr
                ? friendIdSet.has(p.userId.trim().toLowerCase())
                : false;

            const isCurrentUser =
              typeof p.userId === 'string' && userIdStr
                ? p.userId.trim().toLowerCase() === userIdStr.toLowerCase()
                : false;
            
            const joinTimeStr = formatJoinTime(p.joinedAt);
            const tooltipTitle = `${p.name}${joinTimeStr ? ` • Joined ${joinTimeStr}` : ''}`;

            return (
              <Tooltip key={p.userId} title={tooltipTitle} placement="left">
                <Stack alignItems="center" spacing={0.5}>
                  <CoffeeShopChatAvatar
                    photoKeyOrUrl={p.photoURL}
                    name={p.name}
                    size={44}
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
