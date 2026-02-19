import type { INeighborFriend } from 'src/types/neighbor';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { varAlpha } from 'src/theme/dashboard/styles';

import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

type Props = {
  friends?: INeighborFriend[];
};

export function NeighborDetailsFriends({ friends }: Props) {
  const [invited, setInvited] = useState<string[]>([]);

  const handleClick = useCallback(
    (item: string) => {
      const selected = invited.includes(item)
        ? invited.filter((value) => value !== item)
        : [...invited, item];

      setInvited(selected);
    },
    [invited]
  );

  return (
    <>
      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
      >
        {friends?.map((friend) => (
          <FriendItem
            key={friend.id}
            friend={friend}
            selected={invited.includes(friend.id)}
            onSelected={() => handleClick(friend.id)}
          />
        ))}
      </Box>

      <Pagination count={10} sx={{ mt: { xs: 5, md: 8 }, mx: 'auto' }} />
    </>
  );
}

// ----------------------------------------------------------------------

type FriendItemProps = {
  selected: boolean;
  friend: INeighborFriend;
  onSelected: () => void;
};

function FriendItem({ friend, selected, onSelected }: FriendItemProps) {
  return (
    <Card key={friend.id} sx={{ p: 3, gap: 2, display: 'flex' }}>
      <Avatar alt={friend.name} src={friend.avatarUrl} sx={{ width: 48, height: 48 }} />

      <Stack spacing={2} flexGrow={1}>
        <ListItemText
          primary={friend.name}
          secondary={
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:users-group-rounded-bold" width={16} />
              {friend.friends} friends
            </Stack>
          }
          secondaryTypographyProps={{
            mt: 0.5,
            component: 'span',
            typography: 'caption',
            color: 'text.disabled',
          }}
        />

        <Stack spacing={1} direction="row">
          <IconButton
            size="small"
            color="error"
            sx={{
              borderRadius: 1,
              bgcolor: (theme) => varAlpha(theme.vars.palette.error.mainChannel, 0.08),
              '&:hover': {
                bgcolor: (theme) => varAlpha(theme.vars.palette.error.mainChannel, 0.16),
              },
            }}
          >
            <Iconify width={18} icon="solar:phone-bold" />
          </IconButton>

          <IconButton
            size="small"
            color="info"
            sx={{
              borderRadius: 1,
              bgcolor: (theme) => varAlpha(theme.vars.palette.info.mainChannel, 0.08),
              '&:hover': {
                bgcolor: (theme) => varAlpha(theme.vars.palette.info.mainChannel, 0.16),
              },
            }}
          >
            <Iconify width={18} icon="solar:chat-round-dots-bold" />
          </IconButton>

          <IconButton
            size="small"
            color="primary"
            sx={{
              borderRadius: 1,
              bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
              '&:hover': {
                bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
              },
            }}
          >
            <Iconify width={18} icon="fluent:mail-24-filled" />
          </IconButton>
        </Stack>
      </Stack>

      <Button
        size="small"
        variant={selected ? 'text' : 'outlined'}
        color={selected ? 'success' : 'inherit'}
        startIcon={
          selected ? <Iconify width={18} icon="eva:checkmark-fill" sx={{ mr: -0.75 }} /> : null
        }
        onClick={onSelected}
      >
        {selected ? 'Invited' : 'Invite'}
      </Button>
    </Card>
  );
}
