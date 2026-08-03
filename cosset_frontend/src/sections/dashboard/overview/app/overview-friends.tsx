'use client';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';
import { fDateTime } from 'src/utils/format-time';

import { useGetFriends } from 'src/actions/friend';
import { useGetCommunityUsers } from 'src/actions/user';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const FRIEND_LIMIT = 5;

type FriendRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  connectedAt: string | null;
};

const getTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

function FriendAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    const raw = String(avatarUrl || '').trim();

    if (!raw) {
      setSrc('');
      return undefined;
    }

    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('/') ||
      raw.startsWith('public:')
    ) {
      setSrc(raw.startsWith('public:') ? raw.replace(/^public:/, '') : raw);
      return undefined;
    }

    getS3SignedUrl(raw).then((url) => {
      if (!cancelled) setSrc(url || '');
    });

    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  return (
    <Avatar src={src || undefined} alt={name} sx={{ width: 40, height: 40 }}>
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

export function OverviewFriends() {
  const { user } = useAuthContext();
  const currentUserId = String(user?.id || '').trim();
  const canLoad = Boolean(currentUserId);

  const { friends: acceptedRelations, friendsLoading } = useGetFriends(
    currentUserId,
    'accepted',
    canLoad,
  );
  const { users, usersLoading } = useGetCommunityUsers(200, 0, canLoad);

  const friends = useMemo(() => {
    if (!canLoad) return [] as FriendRow[];

    const usersById = new Map(users.map((entry) => [String(entry.id || ''), entry]));
    const rows: FriendRow[] = [];

    acceptedRelations.forEach((relation) => {
      const friendId =
        String(relation.userId1) === currentUserId
          ? String(relation.userId2)
          : String(relation.userId1);
      const entry = usersById.get(friendId);
      if (!entry) return;

      const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
      rows.push({
        id: friendId,
        name: fullName || String(entry.email || '') || 'Friend',
        email: String(entry.email || ''),
        avatarUrl: String(entry.photoURL || entry.avatarUrl || ''),
        connectedAt: relation.respondedAt || relation.requestedAt || null,
      });
    });

    return rows
      .sort((a, b) => getTime(b.connectedAt) - getTime(a.connectedAt))
      .slice(0, FRIEND_LIMIT);
  }, [acceptedRelations, canLoad, currentUserId, users]);

  const loading = canLoad && (friendsLoading || usersLoading);

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 }, height: 1 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h5">Friends</Typography>
          <Typography variant="body2" color="text.secondary">
            Your recent connections
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          href={paths.dashboard.community.friend}
          size="small"
          variant="outlined"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
        >
          View all
        </Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : friends.length ? (
        <Stack spacing={1.25}>
          {friends.map((friend) => (
            <Box
              key={friend.id}
              component={RouterLink}
              href={paths.universe.view(friend.id)}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                textDecoration: 'none',
                color: 'inherit',
                transition: (theme) =>
                  theme.transitions.create(['background-color', 'border-color'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.main',
                },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <FriendAvatar name={friend.name} avatarUrl={friend.avatarUrl} />
                <Stack spacing={0.2} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" noWrap>
                    {friend.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {friend.email || 'Friend'}
                  </Typography>
                  {friend.connectedAt ? (
                    <Typography variant="caption" color="text.disabled">
                      Connected {fDateTime(friend.connectedAt)}
                    </Typography>
                  ) : null}
                </Stack>
                <Iconify icon="eva:arrow-ios-forward-fill" width={16} sx={{ color: 'text.disabled' }} />
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <EmptyContent
          filled
          title={canLoad ? 'No friends yet' : 'Sign in to see friends'}
          description="Accepted friends will appear here."
          sx={{ py: 5 }}
        />
      )}
    </Card>
  );
}
