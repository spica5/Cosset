'use client';

import type {
  CinemaChatMode,
  CinemaChatMessage,
  CinemaChatParticipant,
} from 'src/types/cinema-chat';

import Pusher from 'pusher-js';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Badge from '@mui/material/Badge';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { formatCoffeeShopChatSentAt } from 'src/utils/format-time';
import { playChatNotificationSound } from 'src/utils/chat-notification-sound';

import { useGetFriends } from 'src/actions/friend';
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
  selectedPrivateReceiverId?: string | null;
  onSelectPrivateReceiver?: (participant: CinemaChatParticipant | null) => void;
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

function canClientViewRealtimeMessage(
  message: CinemaChatMessage,
  currentUserId: string,
  friendIdSet: Set<string>,
): boolean {
  const mode = message.chatMode || 'public';
  const authorId = message.userId?.trim().toLowerCase() || '';
  const receiverId = message.receiverId?.trim().toLowerCase() || '';

  if (!authorId || mode === 'public') {
    return true;
  }

  if (authorId === currentUserId) {
    return true;
  }

  if (mode === 'private') {
    return Boolean(currentUserId && receiverId === currentUserId);
  }

  if (mode === 'friend') {
    return Boolean(currentUserId && friendIdSet.has(authorId));
  }

  return false;
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
  selectedPrivateReceiverId = null,
  onSelectPrivateReceiver,
}: Props) {
  const theme = useTheme();
  const { authenticated, user } = useAuthContext();
  const userIdStr = user?.id != null ? String(user.id) : undefined;
  const { friends: acceptedFriends } = useGetFriends(userIdStr, 'accepted', Boolean(userIdStr));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CinemaChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<CinemaChatMode>('public');

  const listRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const openRef = useRef(open);
  openRef.current = open;
  const participantsRef = useRef(participants);
  participantsRef.current = participants;
  const friendIdSetRef = useRef<Set<string>>(new Set());

  const friendIdSet = useMemo(() => {
    const set = new Set<string>();
    const current = userIdStr?.trim().toLowerCase() || '';
    (acceptedFriends || []).forEach((friend) => {
      const a = String(friend.userId1 || '')
        .trim()
        .toLowerCase();
      const b = String(friend.userId2 || '')
        .trim()
        .toLowerCase();
      if (!a || !b || !current) {
        return;
      }
      if (a === current) {
        set.add(b);
      } else if (b === current) {
        set.add(a);
      }
    });
    return set;
  }, [acceptedFriends, userIdStr]);

  friendIdSetRef.current = friendIdSet;

  const selectedPrivateReceiverKey = selectedPrivateReceiverId?.trim().toLowerCase() || '';

  const privateFriendParticipants = useMemo(
    () =>
      participants.filter((p) => {
        if (p.leftAt) {
          return false;
        }
        const id = p.userId.trim().toLowerCase();
        const current = userIdStr?.trim().toLowerCase() || '';
        return Boolean(id && id !== current && friendIdSet.has(id));
      }),
    [friendIdSet, participants, userIdStr],
  );

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
    if (open) {
      setUnreadCount(0);
    }
  }, [open]);

  useEffect(() => {
    if (selectedPrivateReceiverKey) {
      setChatMode('private');
      setOpen(true);
    }
  }, [selectedPrivateReceiverKey]);

  useEffect(() => {
    if (chatMode !== 'private' || selectedPrivateReceiverKey || !onSelectPrivateReceiver) {
      return;
    }

    const firstFriend = privateFriendParticipants[0];
    if (firstFriend) {
      onSelectPrivateReceiver(firstFriend);
    }
  }, [chatMode, selectedPrivateReceiverKey, privateFriendParticipants, onSelectPrivateReceiver]);

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

      const currentUserId = user?.id != null ? String(user.id).trim().toLowerCase() : '';
      if (!canClientViewRealtimeMessage(payload, currentUserId, friendIdSetRef.current)) {
        return;
      }

      seenIds.current.add(payload.id);
      const authorAvatar = resolveMessageAvatar(payload, participantsRef.current, user);
      setMessages((prev) => [...prev, { ...payload, authorAvatar }]);

      const authorId = payload.userId?.trim().toLowerCase();
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
  }, [channelName, hasClientPusherConfig, onParticipantJoin, onParticipantLeave, user]);

  const filteredMessages = useMemo(() => {
    const currentUserId = userIdStr?.trim().toLowerCase() || '';

    if (chatMode === 'public') {
      return messages.filter((m) => (m.chatMode || 'public') === 'public');
    }

    if (chatMode === 'friend') {
      return messages.filter((m) => {
        const authorId = m.userId?.trim().toLowerCase() || '';
        return (
          m.chatMode === 'friend' &&
          ((authorId && friendIdSet.has(authorId)) || authorId === currentUserId)
        );
      });
    }

    return messages.filter((m) => {
      const authorId = m.userId?.trim().toLowerCase() || '';
      const receiverId = m.receiverId?.trim().toLowerCase() || '';

      if (!currentUserId || m.chatMode !== 'private') {
        return false;
      }

      if (!selectedPrivateReceiverKey) {
        return authorId === currentUserId || receiverId === currentUserId;
      }

      return (
        (authorId === currentUserId && receiverId === selectedPrivateReceiverKey) ||
        (authorId === selectedPrivateReceiverKey && receiverId === currentUserId)
      );
    });
  }, [chatMode, friendIdSet, messages, selectedPrivateReceiverKey, userIdStr]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filteredMessages, open]);

  const selectedPrivateReceiverName = useMemo(() => {
    if (!selectedPrivateReceiverKey) {
      return '';
    }

    return (
      participants.find((p) => p.userId.trim().toLowerCase() === selectedPrivateReceiverKey)?.name ||
      ''
    );
  }, [participants, selectedPrivateReceiverKey]);

  const chatModeTitle =
    chatMode === 'public'
      ? 'Cinema chat'
      : chatMode === 'friend'
        ? 'Friends chat'
        : selectedPrivateReceiverName
          ? `Private · ${selectedPrivateReceiverName}`
          : 'Private chat';

  const emptyMessageLabel =
    chatMode === 'friend'
      ? 'No friend messages yet. Chat with accepted friends here.'
      : chatMode === 'private'
        ? selectedPrivateReceiverName
          ? `No private messages with ${selectedPrivateReceiverName} yet.`
          : 'Select a friend in the audience for private chat.'
        : 'Say hello to the audience.';

  const placeholder =
    chatMode === 'friend'
      ? 'Message friends'
      : chatMode === 'private'
        ? selectedPrivateReceiverName
          ? `Private message to ${selectedPrivateReceiverName}`
          : 'Select a friend first'
        : authenticated
          ? 'Message the audience'
          : 'Sign in to chat';

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !isPresent) return;

    if (chatMode === 'private' && !selectedPrivateReceiverId) {
      setSendError('Select a friend for private chat.');
      return;
    }

    try {
      setSending(true);
      setSendError(null);
      const res = await sendCinemaChatMessage(ownerCustomerId, category, {
        message: text,
        displayName: user?.displayName,
        chatMode,
        receiverId: chatMode === 'private' ? selectedPrivateReceiverId : null,
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
  }, [
    category,
    chatMode,
    draft,
    isPresent,
    ownerCustomerId,
    selectedPrivateReceiverId,
    sending,
    user,
  ]);

  const modeButtonSx = (active: boolean, activeColor: string) => ({
    color: active ? activeColor : 'rgba(255,255,255,0.45)',
    border: active ? '1px solid' : '1px solid transparent',
    borderColor: active ? activeColor : 'transparent',
    bgcolor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    minWidth: 34,
    height: 28,
  });

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
        spacing={0.75}
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ color: '#F5E6C8' }}>
            {chatModeTitle}
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

        <Stack direction="row" spacing={0.75}>
          <Tooltip title="Public">
            <IconButton
              size="small"
              onClick={() => setChatMode('public')}
              sx={modeButtonSx(chatMode === 'public', CINEMA_GOLD)}
            >
              <Iconify icon="solar:users-group-rounded-bold" width={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Friends">
            <IconButton
              size="small"
              onClick={() => setChatMode('friend')}
              sx={modeButtonSx(chatMode === 'friend', '#7DDEA2')}
            >
              <Iconify icon="solar:heart-bold" width={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Private">
            <IconButton
              size="small"
              onClick={() => setChatMode('private')}
              sx={modeButtonSx(chatMode === 'private', '#F29C9C')}
            >
              <Iconify icon="solar:lock-bold" width={16} />
            </IconButton>
          </Tooltip>
        </Stack>

        {chatMode === 'private' && authenticated ? (
          <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', pb: 0.25 }}>
            {privateFriendParticipants.length ? (
              privateFriendParticipants.map((friend) => {
                const selected =
                  friend.userId.trim().toLowerCase() === selectedPrivateReceiverKey;
                return (
                  <Chip
                    key={friend.userId}
                    size="small"
                    label={friend.name}
                    onClick={() => onSelectPrivateReceiver?.(friend)}
                    sx={{
                      color: selected ? '#0B0705' : '#F5E6C8',
                      bgcolor: selected ? CINEMA_GOLD : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                );
              })
            ) : (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                No friends in this room yet.
              </Typography>
            )}
          </Stack>
        ) : null}
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
        {filteredMessages.length ? (
          filteredMessages.map((m) => {
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
            const mode = m.chatMode || 'public';

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
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ pl: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                        {m.authorName}
                      </Typography>
                      {mode !== 'public' ? (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                          {mode === 'friend' ? '👥' : '🔒'}
                        </Typography>
                      ) : null}
                    </Stack>
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
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', py: 3 }}
          >
            {emptyMessageLabel}
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
          placeholder={placeholder}
          value={draft}
          disabled={
            !authenticated ||
            !isPresent ||
            sending ||
            (chatMode === 'private' && !selectedPrivateReceiverId)
          }
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
                  disabled={
                    !authenticated ||
                    !isPresent ||
                    sending ||
                    !draft.trim() ||
                    (chatMode === 'private' && !selectedPrivateReceiverId)
                  }
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
