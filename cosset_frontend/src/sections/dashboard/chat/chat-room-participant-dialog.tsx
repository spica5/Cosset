import type { IChatParticipant } from 'src/types/chat';

import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { varAlpha } from 'src/theme/dashboard/styles';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import { useChatCallOptional } from './chat-call-provider';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  participant: IChatParticipant;
  conversationId?: string;
  /** Group rooms cannot place 1:1 WebRTC calls in v1. */
  allowCalls?: boolean;
};

export function ChatRoomParticipantDialog({
  participant,
  open,
  onClose,
  conversationId,
  allowCalls = false,
}: Props) {
  const chatCall = useChatCallOptional();

  const startCall = async (mediaType: 'audio' | 'video') => {
    if (!allowCalls || !conversationId) {
      toast.info('Group calls are not available yet.');
      return;
    }

    if (!chatCall) {
      toast.error('Calling is unavailable right now.');
      return;
    }

    onClose();
    await chatCall.startCall({
      conversationId,
      calleeId: String(participant.id),
      mediaType,
      peerName: participant.name,
      peerAvatarUrl: participant.avatarUrl,
    });
  };

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>

      <DialogContent sx={{ py: 5, px: 3, display: 'flex' }}>
        <Avatar
          alt={participant.name}
          src={participant.avatarUrl}
          sx={{ width: 96, height: 96, mr: 3 }}
        />

        <Stack spacing={1}>
          <Typography variant="caption" sx={{ color: 'primary.main' }}>
            {participant.role}
          </Typography>

          <Typography variant="subtitle1">{participant.name}</Typography>

          <Stack direction="row" sx={{ typography: 'caption', color: 'text.disabled' }}>
            <Iconify
              icon="mingcute:location-fill"
              width={16}
              sx={{ flexShrink: 0, mr: 0.5, mt: '2px' }}
            />
            {participant.address}
          </Stack>

          <Stack spacing={1} direction="row" sx={{ pt: 1.5 }}>
            <IconButton
              size="small"
              color="error"
              onClick={() => startCall('audio')}
              aria-label="Start audio call"
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

            <IconButton
              size="small"
              color="secondary"
              onClick={() => startCall('video')}
              aria-label="Start video call"
              sx={{
                borderRadius: 1,
                bgcolor: (theme) => varAlpha(theme.vars.palette.secondary.mainChannel, 0.08),
                '&:hover': {
                  bgcolor: (theme) => varAlpha(theme.vars.palette.secondary.mainChannel, 0.16),
                },
              }}
            >
              <Iconify width={18} icon="solar:videocamera-record-bold" />
            </IconButton>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
