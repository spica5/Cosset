'use client';

import type { CinemaChatMessage, CinemaChatParticipant } from 'src/types/cinema-chat';

import Pusher from 'pusher-js';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { formatCoffeeShopChatSentAt } from 'src/utils/format-time';
import { playChatNotificationSound } from 'src/utils/chat-notification-sound';

import {
  fetchCinemaChat,
  joinCinemaPresence,
  leaveCinemaPresence,
  sendCinemaChatMessage,
} from 'src/actions/cinema-chat';

import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from 'src/components/universe/iconify';
import { CoffeeShopChatAvatar } from 'src/sections/universe/community/coffee-shop-chat-avatar';

import {
  CINEMA_CHAT_EVENT,
  cinemaChatChannelName,
  CINEMA_PARTICIPANT_JOINED_EVENT,
  CINEMA_PARTICIPANT_LEFT_EVENT,
} from 'src/types/cinema-chat';

import { CINEMA_GOLD, cinemaMobileFabSx } from 'src/sections/dashboard/cinema/cinema-theater-theme';

import { COFFEE_SHOP_MOBILE_DOCK } from './coffee-shop-mobile-panels';

// ----------------------------------------------------------------------

type Props = {
  ownerCustomerId: string;
  category: string;
  participants?: CinemaChatParticipant[];
  onParticipantsLoaded: (participants: CinemaChatParticipant[]) => void;
  onParticipantJoin: (participant: CinemaChatParticipant) => void;
  onParticipantLeave: (userId: string) => void;
  isPresent: boolean;
};

function enrichCinemaParticipant(
  participant: CinemaChatParticipant,
  authUser: { id?: string | number; photoURL?: string | null } | null,
): CinemaChatParticipant {
  const existing = String(participant.photoURL || '').trim();
  if (existing) {
    return { ...participant, photoURL: existing };
  }

  const authId = authUser?.id != null ? String(authUser.id).trim().toLowerCase() : '';
  const participantId = participant.userId.trim().toLowerCase();
  if (authId && authId === participantId) {
    const authPhoto = String(authUser?.photoURL || '').trim();
    if (authPhoto) {
      return { ...participant, photoURL: authPhoto };
    }
  }

  return { ...participant, photoURL: null };
}

function resolveMessageAvatar(
  message: CinemaChatMessage,
  participants: CinemaChatParticipant[],
  authUser: { id?: string | number; photoURL?: string | null } | null,
): string | null {
  const fromMessage = String(message.authorAvatar || '').trim();
  if (fromMessage) {
    return fromMessage;
  }

  const messageUserId = message.userId?.trim().toLowerCase();
  if (messageUserId) {
    const fromParticipant = participants.find(
      (p) => p.userId.trim().toLowerCase() === messageUserId,
    );
    const participantPhoto = String(fromParticipant?.photoURL || '').trim();
    if (participantPhoto) {
      return participantPhoto;
    }

    const authId = authUser?.id != null ? String(authUser.id).trim().toLowerCase() : '';
    if (authId && authId === messageUserId) {
      const authPhoto = String(authUser?.photoURL || '').trim();
      if (authPhoto) {
        return authPhoto;
      }
    }
  }

  return null;
}

const CHAT_NATIVE_INPUT_STYLE = {
  color: '#FFF8E7',
  caretColor: '#FFF8E7',
  WebkitTextFillColor: '#FFF8E7',
} as const;

const CHAT_PLACEHOLDER_SX = {
  color: 'rgba(245, 230, 200, 0.45) !important',
  WebkitTextFillColor: 'rgba(245, 230, 200, 0.45) !important',
  opacity: '1 !important',
} as const;

const chatTextFieldSx = {
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.65)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'rgba(255,255,255,0.88)' },
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.14)',
    color: '#FFF8E7',
    caretColor: '#FFF8E7',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
    '&.Mui-focused fieldset': { borderColor: 'rgba(212,176,90,0.65)' },
  },
  '& .MuiOutlinedInput-input::placeholder': { ...CHAT_PLACEHOLDER_SX },
  '& textarea::placeholder': { ...CHAT_PLACEHOLDER_SX },
  '& .MuiOutlinedInput-input': {
    color: '#FFF8E7 !important',
    caretColor: '#FFF8E7 !important',
    WebkitTextFillColor: '#FFF8E7 !important',
  },
  '& .MuiOutlinedInput-inputMultiline': {
    color: '#FFF8E7 !important',
    caretColor: '#FFF8E7 !important',
    WebkitTextFillColor: '#FFF8E7 !important',
  },
  '& textarea.MuiInputBase-input': {
    color: '#FFF8E7 !important',
    caretColor: '#FFF8E7 !important',
    WebkitTextFillColor: '#FFF8E7 !important',
  },
};

export function UniverseCinemaChat({
  ownerCustomerId,
  category,
  participants = [],
  onParticipantsLoaded,
  onParticipantJoin,
  onParticipantLeave,
  isPresent,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { authenticated, user } = useAuthContext();

  const [open, setOpen] = useState(!isMobile);
  const [messages, setMessages] = useState<CinemaChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const openRef = useRef(open);
  openRef.current = open;
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  const enrichParticipant = useCallback(
    (participant: CinemaChatParticipant) => enrichCinemaParticipant(participant, user),
    [user],
  );

  const channelName = useMemo(
    () => cinemaChatChannelName(ownerCustomerId, category),
    [ownerCustomerId, category],
  );
  const hasClientPusherConfig = Boolean(CONFIG.pusher.key && CONFIG.pusher.cluster);

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
    }
  }, [open]);

  useEffect(() => {
    if (!authenticated || !ownerCustomerId || !category) {
      return undefined;
    }

    let mounted = true;

    const bootstrap = async () => {
      try {
        const [joinRes, chatRes] = await Promise.all([
          joinCinemaPresence(ownerCustomerId, category),
          fetchCinemaChat(ownerCustomerId, category),
        ]);

        if (!mounted) return;

        const loadedParticipants = (
          joinRes.participants?.length ? joinRes.participants : chatRes.participants || []
        ).map((p) => enrichParticipant(p));

        if (joinRes.participant) {
          const self = enrichParticipant(joinRes.participant);
          const exists = loadedParticipants.some(
            (p) => p.userId.trim().toLowerCase() === self.userId.trim().toLowerCase(),
          );
          if (!exists) {
            loadedParticipants.push(self);
          }
        }

        onParticipantsLoaded(loadedParticipants);
        participantsRef.current = loadedParticipants;

        const photoByUserId = new Map(
          loadedParticipants
            .filter((p) => p.photoURL)
            .map((p) => [p.userId.trim().toLowerCase(), p.photoURL as string]),
        );

        const loaded = (chatRes.messages || []).map((m) => {
          const key = m.userId?.trim().toLowerCase();
          const fallback = key ? photoByUserId.get(key) : undefined;
          return {
            ...m,
            authorAvatar: m.authorAvatar || fallback || null,
          };
        });
        loaded.forEach((m) => seenIds.current.add(m.id));
        setMessages(loaded);
      } catch {
        // ignore bootstrap errors
      }
    };

    bootstrap();

    return () => {
      mounted = false;
      if (authenticated) {
        leaveCinemaPresence(ownerCustomerId, category).catch(() => undefined);
      }
    };
  }, [authenticated, category, enrichParticipant, onParticipantsLoaded, ownerCustomerId]);

  useEffect(() => {
    if (!hasClientPusherConfig || !channelName) {
      return undefined;
    }

    const pusher = new Pusher(CONFIG.pusher.key!, {
      cluster: CONFIG.pusher.cluster!,
    });

    const channel = pusher.subscribe(channelName);

    channel.bind(CINEMA_CHAT_EVENT, (payload: CinemaChatMessage) => {
      if (!payload?.id || seenIds.current.has(payload.id)) {
        return;
      }
      seenIds.current.add(payload.id);
      const authorAvatar = resolveMessageAvatar(payload, participantsRef.current, user);
      setMessages((prev) => [...prev, { ...payload, authorAvatar }]);

      const authorId = payload.userId?.trim().toLowerCase();
      const currentUserId = user?.id != null ? String(user.id).trim().toLowerCase() : '';
      const isOwnMessage = Boolean(authorId && currentUserId && authorId === currentUserId);
      if (!isOwnMessage) {
        playChatNotificationSound();
        if (!openRef.current) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    });

    channel.bind(CINEMA_PARTICIPANT_JOINED_EVENT, (payload: CinemaChatParticipant) => {
      if (payload?.userId) {
        onParticipantJoin(enrichCinemaParticipant(payload, user));
      }
    });

    channel.bind(CINEMA_PARTICIPANT_LEFT_EVENT, (payload: { userId?: string }) => {
      if (payload?.userId) {
        onParticipantLeave(payload.userId);
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [
    channelName,
    hasClientPusherConfig,
    onParticipantJoin,
    onParticipantLeave,
    user,
  ]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !isPresent) return;

    try {
      setSending(true);
      setSendError(null);
      const res = await sendCinemaChatMessage(ownerCustomerId, category, {
        message: text,
        displayName: user?.displayName,
      });
      if (res.chatMessage?.id && !seenIds.current.has(res.chatMessage.id)) {
        seenIds.current.add(res.chatMessage.id);
        const authorAvatar = resolveMessageAvatar(res.chatMessage, participantsRef.current, user);
        setMessages((prev) => [...prev, { ...res.chatMessage!, authorAvatar }]);
      }
      setDraft('');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [category, draft, isPresent, ownerCustomerId, sending, user]);

  const chatPanel = open ? (
    <Paper
      elevation={8}
      sx={{
        width: { xs: 'calc(100vw - 24px)', sm: 360 },
        maxHeight: { xs: 'min(50dvh, 360px)', sm: 420 },
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'rgba(10, 8, 6, 0.88)',
        border: '1px solid rgba(212,176,90,0.28)',
        backdropFilter: 'blur(10px)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Typography variant="subtitle2" sx={{ color: '#F5E6C8' }}>
          Cinema chat
        </Typography>
        <IconButton
          size="small"
          onClick={() => setOpen(false)}
          sx={{ color: 'rgba(255,255,255,0.7)' }}
          aria-label="Close chat"
        >
          <Iconify icon="mingcute:close-line" width={18} />
        </IconButton>
      </Stack>

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1.25,
          minHeight: 160,
        }}
      >
        {messages.length ? (
          messages.map((m) => {
            const isSelf =
              user?.id &&
              m.userId &&
              String(m.userId).trim().toLowerCase() === String(user.id).trim().toLowerCase();
            const avatarUrl = resolveMessageAvatar(m, participants, user);
            const participant = participants.find(
              (p) =>
                m.userId &&
                p.userId.trim().toLowerCase() === String(m.userId).trim().toLowerCase(),
            );

            return (
              <Stack
                key={m.id}
                direction="row"
                spacing={1}
                justifyContent={isSelf ? 'flex-end' : 'flex-start'}
                sx={{ mb: 1.25 }}
              >
                {!isSelf ? (
                  <CoffeeShopChatAvatar
                    photoKeyOrUrl={avatarUrl}
                    name={m.authorName}
                    size={36}
                    showTooltip={false}
                    status={participant ? (!participant.leftAt ? 'online' : 'left') : undefined}
                  />
                ) : null}
                <Box sx={{ maxWidth: '78%' }}>
                  {!isSelf ? (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', pl: 0.5 }}>
                      {m.authorName}
                    </Typography>
                  ) : null}
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 1.5,
                      bgcolor: isSelf ? 'rgba(212,176,90,0.22)' : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#FFF8E7', whiteSpace: 'pre-wrap' }}>
                      {m.text}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', pl: 0.5 }}>
                    {formatCoffeeShopChatSentAt(m.sentAt)}
                  </Typography>
                </Box>
                {isSelf ? (
                  <CoffeeShopChatAvatar
                    photoKeyOrUrl={avatarUrl}
                    name={m.authorName}
                    size={36}
                    showTooltip={false}
                    status="online"
                    isCurrentUser
                  />
                ) : null}
              </Stack>
            );
          })
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', py: 3 }}>
            Say hello to the audience.
          </Typography>
        )}
      </Box>

      <Stack spacing={0.75} sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
        {sendError ? (
          <Typography variant="caption" color="error">
            {sendError}
          </Typography>
        ) : null}
        <TextField
          size="small"
          fullWidth
          multiline
          maxRows={3}
          placeholder={authenticated ? 'Message the audience' : 'Sign in to chat'}
          value={draft}
          disabled={!authenticated || !isPresent || sending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          inputProps={{ style: CHAT_NATIVE_INPUT_STYLE }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleSend}
                  disabled={!authenticated || !isPresent || sending || !draft.trim()}
                  sx={{ color: '#D4B05A' }}
                >
                  <Iconify icon="eva:paper-plane-fill" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={chatTextFieldSx}
        />
      </Stack>
    </Paper>
  ) : null;

  return (
    <Box
      sx={{
        position: 'fixed',
        right: COFFEE_SHOP_MOBILE_DOCK.rightInset,
        bottom: COFFEE_SHOP_MOBILE_DOCK.bottom,
        zIndex: theme.zIndex.snackbar,
        pointerEvents: 'auto',
      }}
    >
      <Stack direction="column-reverse" alignItems="flex-end" spacing={1}>
        {chatPanel}

        <IconButton
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Hide chat' : 'Show chat'}
          sx={{
            ...cinemaMobileFabSx,
            ...(open
              ? {
                  border: '2px solid',
                  borderColor: CINEMA_GOLD,
                }
              : undefined),
          }}
        >
          <Badge
            color="error"
            badgeContent={unreadCount}
            max={99}
            invisible={unreadCount <= 0 || open}
            overlap="circular"
          >
            <Iconify icon="solar:chat-round-dots-bold" width={22} />
          </Badge>
        </IconButton>
      </Stack>
    </Box>
  );
}
