'use client';

import type { CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { CoffeeShopChatAvatar } from 'src/sections/universe/community/coffee-shop-chat-avatar';

// ----------------------------------------------------------------------

type Props = {
  participants: CoffeeShopChatParticipant[];
};

export function UniverseCoffeeShopParticipants({ participants }: Props) {
  if (!participants.length) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, sm: 24 },
        top: '50%',
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
          maxHeight: 'min(70vh, 480px)',
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
        {participants.map((p) => (
          <CoffeeShopChatAvatar
            key={p.userId}
            photoKeyOrUrl={p.photoURL}
            name={p.name}
            size={44}
            showTooltip
          />
        ))}
      </Stack>
    </Box>
  );
}
