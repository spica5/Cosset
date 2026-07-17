'use client';

import type { IChatConversation, IChatParticipant } from 'src/types/chat';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AvatarGroup from '@mui/material/AvatarGroup';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useResponsive } from 'src/hooks/use-responsive';

import { fToNow } from 'src/utils/format-time';

import { clickConversation, removeChatContact } from 'src/actions/chat';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { ChatAvatar } from './chat-avatar';
import { getNavItem } from './utils/get-nav-item';

// ----------------------------------------------------------------------

type Props = {
  selected: boolean;
  collapse: boolean;
  onCloseMobile: () => void;
  conversation: IChatConversation;
  onOpenContact?: (contact: IChatParticipant) => void;
};

export function ChatNavItem({
  selected,
  collapse,
  conversation,
  onCloseMobile,
  onOpenContact,
}: Props) {
  const { user } = useAuthContext();

  const mdUp = useResponsive('up', 'md');

  const router = useRouter();
  const searchParams = useSearchParams();

  const [removing, setRemoving] = useState(false);

  const { group, displayName, displayText, participants, lastActivity, hasOnlineInGroup } =
    getNavItem({ conversation, currentUserId: `${user?.id}` });

  const singleParticipant = participants[0];

  const { name, avatarUrl, status } = singleParticipant || {
    name: '',
    avatarUrl: '',
    status: 'offline' as const,
  };

  const handleClickConversation = useCallback(async () => {
    try {
      if (!conversation.id) {
        if (singleParticipant && onOpenContact) {
          await onOpenContact(singleParticipant);
        }
        return;
      }

      if (!mdUp) {
        onCloseMobile();
      }

      await clickConversation(conversation.id);

      router.push(`${paths.dashboard.chat}?id=${conversation.id}`);
    } catch (error) {
      console.error(error);
    }
  }, [conversation.id, mdUp, onCloseMobile, onOpenContact, router, singleParticipant]);

  const handleRemoveContact = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (group || !singleParticipant?.id || removing) {
        return;
      }

      setRemoving(true);

      try {
        await removeChatContact(singleParticipant.id, conversation.id || undefined);
        toast.success(`${singleParticipant.name || 'Contact'} removed`);

        const selectedId = searchParams.get('id');
        if (conversation.id && selectedId === conversation.id) {
          router.push(paths.dashboard.chat);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to remove contact');
      } finally {
        setRemoving(false);
      }
    },
    [conversation.id, group, removing, router, searchParams, singleParticipant]
  );

  const renderGroup = (
    <Badge
      variant={hasOnlineInGroup ? 'online' : 'invisible'}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <AvatarGroup variant="compact" sx={{ width: 48, height: 48 }}>
        {participants.slice(0, 2).map((participant) => (
          <ChatAvatar key={participant.id} alt={participant.name} src={participant.avatarUrl} />
        ))}
      </AvatarGroup>
    </Badge>
  );

  const renderSingle = (
    <Badge key={status} variant={status} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <ChatAvatar alt={name} src={avatarUrl} sx={{ width: 48, height: 48 }} />
    </Badge>
  );

  return (
    <Box component="li" sx={{ display: 'flex' }}>
      <ListItemButton
        onClick={handleClickConversation}
        sx={{
          py: 1.5,
          px: 2.5,
          gap: 2,
          ...(selected && { bgcolor: 'action.selected' }),
        }}
      >
        <Badge
          color="error"
          overlap="circular"
          badgeContent={collapse ? conversation.unreadCount : 0}
        >
          {group ? renderGroup : renderSingle}
        </Badge>

        {!collapse && (
          <>
            <ListItemText
              primary={displayName}
              primaryTypographyProps={{ noWrap: true, component: 'span', variant: 'subtitle2' }}
              secondary={displayText}
              secondaryTypographyProps={{
                noWrap: true,
                component: 'span',
                variant: conversation.unreadCount ? 'subtitle2' : 'body2',
                color: conversation.unreadCount ? 'text.primary' : 'text.secondary',
              }}
            />

            <Stack alignItems="flex-end" sx={{ alignSelf: 'stretch' }}>
              <Typography
                noWrap
                variant="body2"
                component="span"
                sx={{ mb: 0.5, fontSize: 12, color: 'text.disabled' }}
              >
                {fToNow(lastActivity)}
              </Typography>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                {!!conversation.unreadCount && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      bgcolor: 'info.main',
                      borderRadius: '50%',
                    }}
                  />
                )}

                {!group && singleParticipant?.id && (
                  <Tooltip title="Remove contact">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={removing}
                      onClick={handleRemoveContact}
                      sx={{ width: 28, height: 28 }}
                    >
                      {removing ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <Iconify width={16} icon="solar:user-minus-bold" />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>
          </>
        )}
      </ListItemButton>
    </Box>
  );
}
