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

const NEIGHBOR_LIMIT = 5;

type NeighborRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  createdAt?: string | Date | null;
};

const getCreatedAtTime = (value?: string | Date | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const isActiveCustomer = (user: Record<string, any>) => {
  const role = String(user.role || '')
    .trim()
    .toLowerCase();
  if (role === 'business') return false;

  const state = String(user.state || user.status || 'active')
    .trim()
    .toLowerCase();

  return state === 'active' || state === '';
};

function NeighborAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
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

export function OverviewNeighbors() {
  const { user } = useAuthContext();
  const currentUserId = String(user?.id || '').trim();
  const canLoad = Boolean(currentUserId);

  const { users, usersLoading } = useGetCommunityUsers(80, 0, canLoad);
  const { friends: acceptedRelations, friendsLoading } = useGetFriends(
    currentUserId,
    'accepted',
    canLoad,
  );

  const neighbors = useMemo<NeighborRow[]>(() => {
    if (!canLoad) return [];

    const friendIds = new Set<string>();
    acceptedRelations.forEach((relation) => {
      const userId1 = String(relation.userId1 || '');
      const userId2 = String(relation.userId2 || '');
      if (userId1 === currentUserId && userId2) friendIds.add(userId2);
      if (userId2 === currentUserId && userId1) friendIds.add(userId1);
    });

    return users
      .filter(isActiveCustomer)
      .filter((entry) => {
        const id = String(entry.id || '');
        return id && id !== currentUserId && !friendIds.has(id);
      })
      .map((entry) => {
        const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
        return {
          id: String(entry.id),
          name: fullName || entry.email || 'Neighbor',
          email: String(entry.email || ''),
          avatarUrl: String(entry.photoURL || entry.avatarUrl || ''),
          createdAt: entry.createdAt || null,
        };
      })
      .sort((a, b) => getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt))
      .slice(0, NEIGHBOR_LIMIT);
  }, [acceptedRelations, canLoad, currentUserId, users]);

  const loading = canLoad && (usersLoading || friendsLoading);

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
          <Typography variant="h5">Neighbors</Typography>
          <Typography variant="body2" color="text.secondary">
            Newest community members
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          href={paths.dashboard.community.neighbor.root}
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
      ) : neighbors.length ? (
        <Stack spacing={1.25}>
          {neighbors.map((neighbor) => (
            <Box
              key={neighbor.id}
              component={RouterLink}
              href={paths.universe.view(neighbor.id)}
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
                <NeighborAvatar name={neighbor.name} avatarUrl={neighbor.avatarUrl} />
                <Stack spacing={0.2} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" noWrap>
                    {neighbor.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {neighbor.email || 'Community neighbor'}
                  </Typography>
                  {neighbor.createdAt ? (
                    <Typography variant="caption" color="text.disabled">
                      Joined {fDateTime(neighbor.createdAt)}
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
          title={canLoad ? 'No neighbors yet' : 'Sign in to see neighbors'}
          description="New community members will appear here."
          sx={{ py: 5 }}
        />
      )}
    </Card>
  );
}
