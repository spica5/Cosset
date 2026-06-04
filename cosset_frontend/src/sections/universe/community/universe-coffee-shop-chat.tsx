'use client';

import type { CoffeeShopChatMessage, CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';

import { useRef, useMemo, useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import {
  fetchCoffeeShopChatToday,
  joinCoffeeShopPresence,
  leaveCoffeeShopPresence,
  sendCoffeeShopChatMessage,
} from 'src/actions/coffee-shop';
import { GLOBAL_EMOTICON_OPTIONS } from 'src/constants/emoticons';
import { useGetFriends } from 'src/actions/friend';
import { Iconify } from 'src/components/universe/iconify';
import Pusher from 'pusher-js';
import { CoffeeShopChatAvatar } from 'src/sections/universe/community/coffee-shop-chat-avatar';
import {
  COFFEE_SHOP_CHAT_EVENT,
  COFFEE_SHOP_PARTICIPANT_JOINED_EVENT,
  COFFEE_SHOP_PARTICIPANT_LEFT_EVENT,
} from 'src/types/coffee-shop-chat';

// ----------------------------------------------------------------------

const GUEST_NAME_STORAGE_KEY = 'coffee-shop-chat-guest-name';

/** Inline + !important: theme `MuiInputBase` / portal stacking can leave textarea text & caret dark. */
const CHAT_NATIVE_INPUT_STYLE = {
  color: '#ffffff',
  caretColor: '#ffffff',
  WebkitTextFillColor: '#ffffff',
} as const;

/** Placeholder only: dark on the tinted input; typed text stays white via `CHAT_NATIVE_INPUT_STYLE` + input rules. */
const CHAT_PLACEHOLDER_SX = {
  color: 'rgba(146, 130, 130, 0.58) !important',
  WebkitTextFillColor: 'rgba(182, 169, 169, 0.58) !important',
  opacity: '1 !important',
} as const;

/** Dark panel: labels, borders, light input surface, dark placeholder, white typed text */
const chatTextFieldSx = {
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.65)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'rgba(255,255,255,0.88)' },
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.14)',
    color: '#ffffff',
    caretColor: '#ffffff',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
    '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.55)' },
  },
  '& .MuiOutlinedInput-input::placeholder': { ...CHAT_PLACEHOLDER_SX },
  '& textarea::placeholder': { ...CHAT_PLACEHOLDER_SX },
  '& .MuiOutlinedInput-input': {
    color: '#ffffff !important',
    caretColor: '#ffffff !important',
    WebkitTextFillColor: '#ffffff !important',
  },
  '& .MuiOutlinedInput-inputMultiline': {
    color: '#ffffff !important',
    caretColor: '#ffffff !important',
    WebkitTextFillColor: '#ffffff !important',
  },
  '& textarea.MuiInputBase-input': {
    color: '#ffffff !important',
    caretColor: '#ffffff !important',
    WebkitTextFillColor: '#ffffff !important',
  },
};

function channelNameForShop(id: string) {
  const n = Number.parseInt(id, 10);
  return Number.isNaN(n) ? null : `coffee-shop-${n}`;
}

type ChatProps = {
  coffeeShopId: string;
  onParticipantsLoaded?: (participants: CoffeeShopChatParticipant[]) => void;
  onParticipantJoin?: (participant: CoffeeShopChatParticipant) => void;
  onParticipantLeave?: (userId: string) => void;
  onPresenceLoadingChange?: (loading: boolean) => void;
  isPresent?: boolean;
  isHidden?: boolean;
  onSystemNotification?: (text: string, avatar?: string | null, userId?: string) => void;
};

function enrichParticipantPhoto(
  participant: CoffeeShopChatParticipant,
  authUser: { id?: string | number; photoURL?: string | null } | null,
): CoffeeShopChatParticipant {
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

export function UniverseCoffeeShopChat({
  coffeeShopId,
  onParticipantsLoaded,
  onParticipantJoin,
  onParticipantLeave,
  onPresenceLoadingChange,
  isPresent = true,
  isHidden = false,
  onSystemNotification,
}: ChatProps) {
  const { authenticated, user, loading: authLoading } = useAuthContext();
  const channelName = useMemo(() => channelNameForShop(coffeeShopId), [coffeeShopId]);

  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<CoffeeShopChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [guestName, setGuestName] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'public' | 'friend' | 'private'>('public');
  const [emoticonsOpen, setEmoticonsOpen] = useState(false);
  const [participantStatusVersion, setParticipantStatusVersion] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const sendInFlightRef = useRef(false);
  const onParticipantJoinRef = useRef(onParticipantJoin);
  onParticipantJoinRef.current = onParticipantJoin;
  const participantsRef = useRef<CoffeeShopChatParticipant[]>([]);

  const hasClientPusherConfig = Boolean(CONFIG.pusher.key && CONFIG.pusher.cluster);

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // load accepted friends for current user so we can mark friend avatars
  const userIdStr = user?.id != null ? String(user.id) : undefined;
  const { friends: acceptedFriends } = useGetFriends(userIdStr, 'accepted', Boolean(userIdStr));
  const friendIdSet = useMemo(() => {
    const s = new Set<string>();
    const validFriends = (acceptedFriends || []).filter((f) => {
      const a = (f.userId1 || '').trim();
      const b = (f.userId2 || '').trim();
      return a && b;
    });
    validFriends.forEach((f) => {
      const a = (f.userId1 || '').trim();
      const b = (f.userId2 || '').trim();
      if (userIdStr && a.toLowerCase() === userIdStr.toLowerCase()) {
        s.add(b.toLowerCase());
      } else if (userIdStr && b.toLowerCase() === userIdStr.toLowerCase()) {
        s.add(a.toLowerCase());
      }
    });
    return s;
  }, [acceptedFriends, userIdStr]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || authenticated) {
      return;
    }
    try {
      const stored = window.localStorage.getItem(GUEST_NAME_STORAGE_KEY);
      if (stored) {
        setGuestName(stored);
      }
    } catch {
      // ignore
    }
  }, [authenticated]);

  const appendMessage = useCallback(
    (msg: CoffeeShopChatMessage) => {
      if (!msg?.id || seenIds.current.has(msg.id)) {
        return;
      }

      // route system messages to ephemeral notification only
      if (msg.kind === 'system') {
        try {
          onSystemNotification?.(msg.text, msg.authorAvatar ?? null, msg.userId ?? undefined);
        } catch {
          // ignore
        }
        // mark seen so we don't process again
        seenIds.current.add(msg.id);
        return;
      }

      seenIds.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
    },
    [onSystemNotification],
  );

  const appendEnteredMessage = useCallback(
    (participant: CoffeeShopChatParticipant) => {
      // notify visually but do not add an enter system message to chat history
      onSystemNotification?.(`${participant.name} entered the coffee shop`, participant.photoURL, participant.userId);
    },
    [onSystemNotification],
  );

  const enrichParticipant = useCallback(
    (participant: CoffeeShopChatParticipant) => enrichParticipantPhoto(participant, user),
    [user],
  );

  const handleParticipantJoined = useCallback(
    (participant: CoffeeShopChatParticipant) => {
      if (!participant?.userId) {
        return;
      }
      const enriched = enrichParticipant(participant);
      onParticipantJoinRef.current?.(enriched);
      appendEnteredMessage(enriched);
      // keep local ref in sync
      participantsRef.current = participantsRef.current.filter(
        (p) => p.userId.trim().toLowerCase() !== enriched.userId.trim().toLowerCase(),
      );
      participantsRef.current.push(enriched);
    },
    [appendEnteredMessage, enrichParticipant],
  );

  const handleParticipantJoinedRef = useRef(handleParticipantJoined);
  handleParticipantJoinedRef.current = handleParticipantJoined;

  const insertEmoticon = useCallback(
    (value: string) => {
      const input = messageInputRef.current;
      if (!input) {
        setDraft((prev) => prev + value);
        return;
      }

      const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
      const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : start;
      const nextDraft = `${draft.slice(0, start)}${value}${draft.slice(end)}`;
      setDraft(nextDraft);

      window.setTimeout(() => {
        if (input && typeof input.setSelectionRange === 'function') {
          const position = start + value.length;
          input.setSelectionRange(position, position);
          input.focus();
        }
      }, 0);
      setEmoticonsOpen(false);
    },
    [draft],
  );

  useEffect(() => {
    if (authLoading || !authenticated || !user?.id) {
      return undefined;
    }

    let cancelled = false;

    const setLoading = (loading: boolean) => {
      if (!cancelled) {
        onPresenceLoadingChange?.(loading);
      }
    };

    const join = async () => {
      setLoading(true);
      try {
        const { participant } = await joinCoffeeShopPresence(coffeeShopId);
        if (!cancelled && participant) {
          handleParticipantJoinedRef.current(participant);
          try {
            if (typeof window !== 'undefined') {
              // Use the joinedAt from participant to match the server timestamp
              const joinedAtMs = participant.joinedAt
                ? new Date(participant.joinedAt).getTime()
                : Date.now();
              window.localStorage.setItem(`coffee-shop-last-joined:${coffeeShopId}`, String(joinedAtMs));
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    join();

    return () => {
      cancelled = true;
      leaveCoffeeShopPresence(coffeeShopId).catch(() => undefined);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(`coffee-shop-last-joined:${coffeeShopId}`);
        }
      } catch {
        // ignore
      }
    };
  }, [authLoading, authenticated, coffeeShopId, onPresenceLoadingChange, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadToday = async () => {
      try {
        const res = await fetchCoffeeShopChatToday(coffeeShopId);
        if (cancelled) {
          return;
        }
        // filter out server-side system messages; we show those as ephemeral notifications
        const list = (res.messages ?? []).filter((m) => m.kind !== 'system');
        const loadedParticipants = (res.participants ?? []).map((p) => enrichParticipant(p));
        participantsRef.current = loadedParticipants;

        // set messages to server-provided non-system messages
        seenIds.current = new Set(list.map((m) => m.id));
        setMessages(list);

        onParticipantsLoaded?.(loadedParticipants);
      } catch {
        if (!cancelled) {
          seenIds.current.clear();
          setMessages([]);
        }
      }
    };

    seenIds.current.clear();
    setMessages([]);
    loadToday();

    return () => {
      cancelled = true;
    };
  }, [coffeeShopId, enrichParticipant, onParticipantsLoaded]);

  useEffect(() => {
    if (!hasClientPusherConfig || !channelName) {
      return undefined;
    }

    const pusher = new Pusher(CONFIG.pusher.key, {
      cluster: CONFIG.pusher.cluster,
    });

    const channel = pusher.subscribe(channelName);

    channel.bind(COFFEE_SHOP_CHAT_EVENT, (data: CoffeeShopChatMessage) => {
      appendMessage(data);
    });

    channel.bind(COFFEE_SHOP_PARTICIPANT_JOINED_EVENT, (data: CoffeeShopChatParticipant) => {
      if (data?.userId) {
        handleParticipantJoinedRef.current(data);
      }
    });

    channel.bind(COFFEE_SHOP_PARTICIPANT_LEFT_EVENT, (data: { userId?: string }) => {
      const uid = data?.userId?.trim();
      if (!uid) return;

      // try to append a system left message using known participants; fallback to id
      const found = participantsRef.current.find((p) => p.userId.trim().toLowerCase() === uid.toLowerCase());

      // mark local ref as left if known
      if (found) {
        participantsRef.current = participantsRef.current.map((p) =>
          p.userId.trim().toLowerCase() === uid.toLowerCase() ? { ...p, leftAt: new Date().toISOString().replace('T', ' ').replace('Z', '') } : p,
        );
        // Trigger re-render so avatar status updates from online to offline
        setParticipantStatusVersion(v => v + 1);
      }

      const displayName = found ? found.name : uid;
      const avatar = found ? found.photoURL : undefined;
      // show ephemeral notification but do not add a system message to chat
      onSystemNotification?.(`${displayName} left the coffee shop`, avatar ?? null, uid);

      if (uid && onParticipantLeave) {
        onParticipantLeave(uid);
      }
    });

    return () => {
      channel.unbind(COFFEE_SHOP_CHAT_EVENT);
      channel.unbind(COFFEE_SHOP_PARTICIPANT_JOINED_EVENT);
      channel.unbind(COFFEE_SHOP_PARTICIPANT_LEFT_EVENT);
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [appendMessage, channelName, hasClientPusherConfig, onParticipantLeave, onSystemNotification]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const persistGuestName = useCallback((name: string) => {
    if (typeof window === 'undefined' || authenticated) {
      return;
    }
    try {
      window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, name.trim());
    } catch {
      // ignore
    }
  }, [authenticated]);

  const filteredMessages = useMemo(() => {
    if (chatMode === 'public') {
      return messages.filter((m:CoffeeShopChatMessage) => (m.chatMode || 'public') === 'public');
    }

    if (chatMode === 'friend') {
      return messages.filter((m:CoffeeShopChatMessage) => {
        const messageAuthorId = m.userId?.trim().toLowerCase();
        const currentUserId = userIdStr?.toLowerCase();
        // Show messages from friends and from current user
        return (m.chatMode === 'friend') && ((messageAuthorId && friendIdSet.has(messageAuthorId)) || (messageAuthorId === currentUserId));
        
      });
    }

    if (chatMode === 'private') {
      return messages.filter((m:CoffeeShopChatMessage) => {
        const messageAuthorId = m.userId?.trim().toLowerCase();
        const currentUserId = userIdStr?.toLowerCase();
        return messageAuthorId === currentUserId;
      });
    }

    return [];
  }, [chatMode, messages, friendIdSet, userIdStr]);

  const chatModeTitle =
    chatMode === 'public'
      ? 'Chat (Public)'
      : chatMode === 'friend'
      ? 'Chat (Friends)'
      : 'Chat (Private)';

  const emptyMessageLabel =
    chatMode === 'friend'
      ? 'No messages from friends. Connect with friends to see their messages.'
      : chatMode === 'private'
      ? 'No private messages yet. Messages you send in private mode appear here.'
      : 'No public messages yet. Say hello.';

  const handleSend = async () => {
    if (sendInFlightRef.current) {
      return;
    }

    const text = draft.trim();
    if (!text || !channelName) {
      return;
    }

    if (!hasClientPusherConfig) {
      setSendError('Chat is not configured: set NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER.');
      return;
    }

    if (!authenticated && !guestName.trim()) {
      setSendError('Add your name to send a message.');
      return;
    }

    sendInFlightRef.current = true;
    setSendError(null);
    setSending(true);
    setDraft('');

    try {
      const res = await sendCoffeeShopChatMessage(coffeeShopId, {
        message: text,
        displayName: authenticated ? undefined : guestName.trim(),
        chatMode,
      });

      const incoming = res?.chatMessage as CoffeeShopChatMessage | undefined;
      if (incoming) {
        appendMessage(incoming);
      }
      if (!authenticated) {
        persistGuestName(guestName);
      }
    } catch (err: unknown) {
      setDraft(text);
      let msg = 'Could not send message.';
      if (typeof err === 'string') {
        msg = err;
      } else if (err && typeof err === 'object') {
        const data = err as { message?: unknown };
        if (typeof data.message === 'string') {
          msg = data.message;
        }
      }
      setSendError(msg);
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
    }
  };

  const handleDraftKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === ':' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (hasClientPusherConfig && isPresent && !isHidden) {
          setEmoticonsOpen(true);
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (hasClientPusherConfig && isPresent && !isHidden) {
          setEmoticonsOpen((current) => !current);
        }
        return;
      }

      if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || e.repeat) {
        return;
      }

      e.preventDefault();
      handleSend();
    },
    [handleSend, hasClientPusherConfig, isHidden, isPresent],
  );

  if (!channelName || !portalTarget) {
    return null;
  }

  const panel = (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, sm: 24 },
        bottom: { xs: 12, sm: 24 },
        zIndex: (theme) => theme.zIndex.snackbar,
        maxWidth: '100%',
        width: 360,
        pointerEvents: 'auto',
      }}
    >
      <Paper
        elevation={12}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'rgba(15, 20, 28, 0.82)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
            cursor: 'pointer',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}  onClick={() => setOpen((v) => !v)}>
            <Iconify icon="solar:chat-round-dots-bold" width={22} sx={{ color: 'common.white' }} />
            <Typography variant="subtitle2" sx={{ color: 'common.white' }}>
              {chatModeTitle}
            </Typography>
          </Stack>

          {/* Chat Mode Selector - Icon Buttons */}
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                onClick={() => setChatMode('public')}
                disabled={!isPresent}
                sx={{
                  color: chatMode === 'public' ? 'primary.main' : 'rgba(255,255,255,0.4)',
                  border: chatMode === 'public' ? '1px solid' : '1px solid transparent',
                  borderColor: chatMode === 'public' ? 'primary.main' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s',
                  '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
                }}
                title="Public - Visible to all"
              >
                <Iconify icon="eva:globe-2-fill" width={20} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setChatMode('friend')}
                disabled={!isPresent}
                sx={{
                  color: chatMode === 'friend' ? 'success.light' : 'rgba(255,255,255,0.4)',
                  border: chatMode === 'friend' ? '1px solid' : '1px solid transparent',
                  borderColor: chatMode === 'friend' ? 'success.light' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s',
                  '&:hover': { color: 'success.light', borderColor: 'success.light' },
                }}
                title="Friends Only - Visible to friends"
              >
                <Iconify icon="eva:people-fill" width={20} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setChatMode('private')}
                disabled={!isPresent}
                sx={{
                  color: chatMode === 'private' ? 'error.light' : 'rgba(255,255,255,0.4)',
                  border: chatMode === 'private' ? '1px solid' : '1px solid transparent',
                  borderColor: chatMode === 'private' ? 'error.light' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s',
                  '&:hover': { color: 'error.light', borderColor: 'error.light' },
                }}
                title="Private - Only for you"
              >
                <Iconify icon="eva:lock-fill" width={20} />
              </IconButton>

              <IconButton
                size="small"
                sx={{ color: 'common.white' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
              >
                <Iconify icon={open ? 'eva:arrow-down-fill' : 'eva:arrow-up-fill'} width={20} />
              </IconButton>
            </Stack>

          
        </Stack>

        <Collapse in={open}>
          <Stack sx={{ p: 1.5, pt: 1 }} spacing={1.25}>
            {!hasClientPusherConfig && (
              <Typography variant="caption" sx={{ color: 'warning.light', lineHeight: 1.5 }}>
                Add{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', color: 'common.white' }}>
                  NEXT_PUBLIC_PUSHER_KEY
                </Box>{' '}
                and{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', color: 'common.white' }}>
                  NEXT_PUBLIC_PUSHER_CLUSTER
                </Box>{' '}
                to your frontend env (and Pusher credentials on the API). Restart the dev server after
                changing env.
              </Typography>
            )}

            {!authenticated && (
              <TextField
                size="small"
                fullWidth
                label="Your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onBlur={() => persistGuestName(guestName)}
                inputProps={{ style: CHAT_NATIVE_INPUT_STYLE }}
                sx={chatTextFieldSx}
                disabled={!isPresent}
              />
            )}
            
            <Box
              ref={listRef}
              sx={{
                maxHeight: 220,
                overflowY: 'auto',
                pr: 0.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {filteredMessages.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', py: 1 }}>
                  {emptyMessageLabel}
                </Typography>
              ) : (
                filteredMessages.map((m) => {
                  const isSystem = m.kind === 'system';

                  const isFriend =
                    typeof m.userId === 'string' && userIdStr
                      ? friendIdSet.has(m.userId.trim().toLowerCase())
                      : false;

                  const isCurrentUser =
                    typeof m.userId === 'string' && userIdStr
                      ? m.userId.trim().toLowerCase() === userIdStr.toLowerCase()
                      : false;

                  // Check if the message author has left the coffee shop
                  const messageAuthorId = m.userId?.trim().toLowerCase();
                  const participant = participantsRef.current.find(
                    (p) => p.userId.trim().toLowerCase() === messageAuthorId,
                  );
                  const status = participant?.joinedAt && !participant?.leftAt ? 'online' : 'left';

                  return (
                    <Stack key={m.id} direction="row" spacing={1.25} alignItems="flex-start">
                      <CoffeeShopChatAvatar
                        photoKeyOrUrl={m.authorAvatar}
                        name={m.authorName}
                        size={32}
                        isFriend={isFriend}
                        isCurrentUser={isCurrentUser}
                        status={status}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        {!isSystem && (
                          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.25 }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                              {m.authorName}
                              {m.sentAt
                                ? ` · ${new Date(m.sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit',  hour12: true,})}`
                                : ''}

                            </Typography>
                            {m.chatMode && m.chatMode !== 'public' && (
                              <Chip
                                label={m.chatMode === 'friend' ? '👥' : '🔒'}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 18,
                                  fontSize: '0.625rem',
                                  borderColor: 'rgba(255,255,255,0.3)',
                                  color: m.chatMode === 'private' ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 200, 255, 0.8)',
                                }}
                              />
                            )}
                          </Stack>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: isSystem ? 'rgba(144, 220, 160, 0.95)' : 'common.white',
                            fontStyle: isSystem ? 'italic' : undefined,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {m.text}
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })
              )}
            </Box>

            {sendError && (
              <Typography variant="caption" color="error">
                {sendError}
              </Typography>
            )}

            <TextField
              size="small"
              fullWidth
              multiline
              maxRows={3}
              placeholder="Message"
              value={draft}
              disabled={!hasClientPusherConfig || !isPresent || isHidden}
              onChange={(e) => setDraft(e.target.value)}
              inputRef={messageInputRef}
              onKeyDown={handleDraftKeyDown}
              inputProps={{
                style: CHAT_NATIVE_INPUT_STYLE,
              }}
              InputProps={{
                sx: {
                  pr: 0.5,
                  '& textarea::placeholder': { ...CHAT_PLACEHOLDER_SX },
                  '& textarea.MuiOutlinedInput-input': {
                    color: '#ffffff !important',
                    caretColor: '#ffffff !important',
                    WebkitTextFillColor: '#ffffff !important',
                  },
                },
              
                endAdornment: (                  
                  <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1, mr:1 }}>
                    <IconButton
                      type="button"
                      edge="start"
                      onClick={() => setEmoticonsOpen((current) => !current)}
                      disabled={!hasClientPusherConfig || !isPresent || isHidden}
                      sx={{ color: 'common.white' }}
                      aria-label="Toggle emoticons"
                    >
                      <Box component="span" sx={{ fontSize: 16 }}>
                        😊
                      </Box>
                    </IconButton>
                    <IconButton
                      type="button"
                      edge="end"
                      onClick={() => handleSend()}
                      disabled={sending || !draft.trim() || !hasClientPusherConfig || !isPresent || isHidden}
                      sx={{ color: 'primary.main' }}
                    >
                      <Iconify icon="eva:paper-plane-fill" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={[chatTextFieldSx, { '& .MuiInputBase-root': { alignItems: 'flex-start' } }]}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', pt: 0.5 }}>
              Press  &apos;:&apos; or Ctrl+E to open emoticons, Enter to send.
            </Typography>
            {emoticonsOpen && (
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ maxWidth: '100%', overflowX: 'auto', pt: 0.5 }}>
                {GLOBAL_EMOTICON_OPTIONS.map((option) => (
                  <IconButton
                    key={option.value}
                    type="button"
                    onClick={() => insertEmoticon(option.value)}
                    sx={{ minWidth: 34, minHeight: 34, p: 0.5, color: 'common.white', border: '1px solid rgba(255,255,255,0.12)' }}
                    aria-label={option.label}
                  >
                    <Box component="span" sx={{ fontSize: 18 }}>
                      {option.value}
                    </Box>
                  </IconButton>
                ))}
              </Stack>
            )}
            {!isPresent && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                You are not present in this coffee shop — chat actions are disabled.
              </Typography>
            )}
            {isHidden && (
              <Typography variant="caption" sx={{ color: 'rgba(255, 193, 7, 0.9)' }}>
                You are hidden from others — click the eye icon to show yourself.
              </Typography>
            )}
          </Stack>
        </Collapse>
      </Paper>
    </Box>
  );

  return createPortal(panel, portalTarget);
}
