'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import { m } from 'framer-motion';
import { useMemo, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import SvgIcon from '@mui/material/SvgIcon';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useGetUsers } from 'src/actions/user';
import { useGetFriends } from 'src/actions/friend';
import { useAuthContext } from 'src/auth/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import { varHover } from 'src/components/dashboard/animate';
import { Scrollbar } from 'src/components/dashboard/scrollbar';
import { usePopover, CustomPopover } from 'src/components/dashboard/custom-popover';

// ----------------------------------------------------------------------

type ContactItem = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: 'online' | 'offline' | 'busy' | 'alway';
};

type ContactRowProps = {
  contact: ContactItem;
  onSelect: (contact: ContactItem) => void;
};

function ContactRow({ contact, onSelect }: ContactRowProps) {
  const [avatarSrc, setAvatarSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    const raw = String(contact.avatarUrl || '').trim();

    if (!raw) {
      setAvatarSrc('');
      return undefined;
    }

    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('/') ||
      raw.startsWith('public:')
    ) {
      setAvatarSrc(raw.startsWith('public:') ? raw.replace(/^public:/, '') : raw);
      return undefined;
    }

    (async () => {
      const url = await getS3SignedUrl(raw);
      if (!cancelled) {
        setAvatarSrc(url || '');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contact.avatarUrl]);

  return (
    <MenuItem key={contact.id} sx={{ p: 1 }} onClick={() => onSelect(contact)}>
      <Badge
        variant={contact.status}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ mr: 2 }}
      >
        <Avatar alt={contact.name} src={avatarSrc || undefined}>
          {contact.name.charAt(0).toUpperCase()}
        </Avatar>
      </Badge>

      <ListItemText
        primary={contact.name}
        secondary={contact.email}
        primaryTypographyProps={{ typography: 'subtitle2', noWrap: true }}
        secondaryTypographyProps={{ typography: 'caption', color: 'text.disabled', noWrap: true }}
      />
    </MenuItem>
  );
}

// ----------------------------------------------------------------------

export type ContactsPopoverProps = IconButtonProps;

export function ContactsPopover({ sx, ...other }: ContactsPopoverProps) {
  const popover = usePopover();
  const router = useRouter();
  const { user } = useAuthContext();

  const currentUserId = user?.id ? String(user.id).trim() : '';
  const canLoad = Boolean(currentUserId);

  const { friends: acceptedRelations, friendsLoading } = useGetFriends(
    currentUserId,
    'accepted',
    canLoad,
  );
  const { users, usersLoading } = useGetUsers(500, 0, canLoad);

  const contacts = useMemo<ContactItem[]>(() => {
    if (!canLoad) {
      return [];
    }

    const friendIds = new Set(
      acceptedRelations.map((relation) =>
        relation.userId1 === currentUserId ? relation.userId2 : relation.userId1,
      ),
    );

    return users
      .filter((entry) => friendIds.has(String(entry.id)))
      .map((entry) => {
        const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();

        return {
          id: String(entry.id),
          name: fullName || entry.email || 'Friend',
          email: String(entry.email || ''),
          avatarUrl: String(entry.photoURL || ''),
          status: 'offline' as const,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [acceptedRelations, canLoad, currentUserId, users]);

  const loading = canLoad && (friendsLoading || usersLoading);

  const handleSelectContact = (contact: ContactItem) => {
    popover.onClose();
    router.push(paths.dashboard.community.friend);
  };

  return (
    <>
      <IconButton
        component={m.button}
        whileTap="tap"
        whileHover="hover"
        variants={varHover(1.05)}
        onClick={popover.onOpen}
        sx={{
          ...(popover.open && { bgcolor: (theme) => theme.vars.palette.action.selected }),
          ...sx,
        }}
        {...other}
      >
        <SvgIcon>
          <circle cx="15" cy="6" r="3" fill="currentColor" opacity="0.4" />
          <ellipse cx="16" cy="17" fill="currentColor" opacity="0.4" rx="5" ry="3" />
          <circle cx="9.001" cy="6" r="4" fill="currentColor" />
          <ellipse cx="9.001" cy="17.001" fill="currentColor" rx="7" ry="4" />
        </SvgIcon>
      </IconButton>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{
          arrow: { offset: 20 },
        }}
      >
        <Typography variant="h6" sx={{ p: 1.5 }}>
          Friends <span>({contacts.length})</span>
        </Typography>

        <Scrollbar sx={{ height: 320, width: 320 }}>
          {loading ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : null}

          {!loading && contacts.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ px: 2, py: 3, color: 'text.secondary', textAlign: 'center' }}
            >
              {canLoad ? 'No friends yet.' : 'Sign in to see your friends.'}
            </Typography>
          ) : null}

          {!loading
            ? contacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onSelect={handleSelectContact}
                />
              ))
            : null}
        </Scrollbar>
      </CustomPopover>
    </>
  );
}
