import type { IChatParticipant } from 'src/types/chat';

import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';

import { useBoolean } from 'src/hooks/use-boolean';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import { CollapseButton } from './styles';
import { useChatCallOptional } from './chat-call-provider';

// ----------------------------------------------------------------------

type Props = {
  participant: IChatParticipant;
  conversationId?: string;
};

export function ChatRoomSingle({ participant, conversationId }: Props) {
  const collapse = useBoolean(true);
  const chatCall = useChatCallOptional();

  const startCall = async (mediaType: 'audio' | 'video') => {
    if (!conversationId || !participant?.id) {
      toast.error('Select a conversation to start a call.');
      return;
    }
    if (!chatCall) {
      toast.error('Calling is unavailable right now.');
      return;
    }

    await chatCall.startCall({
      conversationId,
      calleeId: String(participant.id),
      mediaType,
      peerName: participant.name,
      peerAvatarUrl: participant.avatarUrl,
    });
  };

  const renderInfo = (
    <Stack alignItems="center" sx={{ py: 5 }}>
      <Avatar
        alt={participant?.name}
        src={participant?.avatarUrl}
        sx={{ width: 96, height: 96, mb: 2 }}
      />
      <Typography variant="subtitle1">{participant?.name}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
        {participant?.role}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          size="small"
          variant="soft"
          color="success"
          startIcon={<Iconify icon="solar:phone-bold" width={18} />}
          onClick={() => startCall('audio')}
        >
          Call
        </Button>
        <Button
          size="small"
          variant="soft"
          color="primary"
          startIcon={<Iconify icon="solar:videocamera-record-bold" width={18} />}
          onClick={() => startCall('video')}
        >
          Video
        </Button>
      </Stack>
    </Stack>
  );

  const renderContact = (
    <Stack spacing={2} sx={{ px: 2, py: 2.5 }}>
      {[
        { icon: 'mingcute:location-fill', value: participant?.address },
        { icon: 'solar:phone-bold', value: participant?.phoneNumber },
        { icon: 'fluent:mail-24-filled', value: participant?.email },
      ].map((item) => (
        <Stack
          key={item.icon}
          spacing={1}
          direction="row"
          sx={{ typography: 'body2', wordBreak: 'break-all' }}
        >
          <Iconify icon={item.icon} sx={{ flexShrink: 0, color: 'text.disabled' }} />
          {item.value}
        </Stack>
      ))}
    </Stack>
  );

  return (
    <>
      {renderInfo}

      <CollapseButton selected={collapse.value} onClick={collapse.onToggle}>
        Information
      </CollapseButton>

      <Collapse in={collapse.value}>{renderContact}</Collapse>
    </>
  );
}
