'use client';

import type { CoffeeShopChatMessage, CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Collapse from '@mui/material/Collapse';

import { Iconify } from 'src/components/universe/iconify';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { CONFIG } from 'src/config-global';
import {
  fetchCoffeeShopChatToday,
  joinCoffeeShopPresence,
  leaveCoffeeShopPresence,
  sendCoffeeShopChatMessage,
} from 'src/actions/coffee-shop';
import { CoffeeShopChatAvatar } from 'src/sections/universe/community/coffee-shop-chat-avatar';

import Pusher from 'pusher-js';

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
}: ChatProps) {
  const { authenticated, user, loading: authLoading } = useAuthContext();
  const channelName = useMemo(() => channelNameForShop(coffeeShopId), [coffeeShopId]);

  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<CoffeeShopChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [guestName, setGuestName] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const sendInFlightRef = useRef(false);
  const onParticipantJoinRef = useRef(onParticipantJoin);
  onParticipantJoinRef.current = onParticipantJoin;

  const hasClientPusherConfig = Boolean(CONFIG.pusher.key && CONFIG.pusher.cluster);

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

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

  const appendMessage = useCallback((msg: CoffeeShopChatMessage) => {
    if (!msg?.id || seenIds.current.has(msg.id)) {
      return;
    }
    seenIds.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  const appendEnteredMessage = useCallback(
    (participant: CoffeeShopChatParticipant) => {
      const enterId = `system:entered:${participant.userId.trim().toLowerCase()}`;
      if (seenIds.current.has(enterId)) {
        return;
      }

      const shopId = Number.parseInt(coffeeShopId, 10);
      appendMessage({
        id: enterId,
        coffeeShopId: Number.isNaN(shopId) ? 0 : shopId,
        text: `${participant.name} entered the coffee shop`,
        authorName: participant.name,
        authorAvatar: participant.photoURL,
        userId: participant.userId,
        sentAt: new Date().toISOString(),
        kind: 'system',
      });
    },
    [appendMessage, coffeeShopId],
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
    },
    [appendEnteredMessage, enrichParticipant],
  );

  const handleParticipantJoinedRef = useRef(handleParticipantJoined);
  handleParticipantJoinedRef.current = handleParticipantJoined;

  useEffect(() => {
    if (authLoading || !authenticated || !user?.id) {
      return undefined;
    }

    let cancelled = false;

    const join = async () => {
      try {
        const { participant } = await joinCoffeeShopPresence(coffeeShopId);
        if (!cancelled && participant) {
          handleParticipantJoinedRef.current(participant);
        }
      } catch {
        // ignore
      }
    };

    join();

    return () => {
      cancelled = true;
      leaveCoffeeShopPresence(coffeeShopId).catch(() => undefined);
    };
  }, [authLoading, authenticated, coffeeShopId, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadToday = async () => {
      try {
        const res = await fetchCoffeeShopChatToday(coffeeShopId);
        if (cancelled) {
          return;
        }
        const list = res.messages ?? [];
        const loadedParticipants = (res.participants ?? []).map((p) => enrichParticipant(p));

        setMessages((prev) => {
          const system = prev.filter((m) => m.kind === 'system');
          const merged = [...list];

          system.forEach((s) => {
            if (!merged.some((m) => m.id === s.id)) {
              merged.push(s);
            }
          });

          seenIds.current = new Set(merged.map((m) => m.id));
          return merged;
        });

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
  }, [appendMessage, channelName, hasClientPusherConfig, onParticipantLeave]);

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
          onClick={() => setOpen((v) => !v)}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:chat-round-dots-bold" width={22} sx={{ color: 'common.white' }} />
            <Typography variant="subtitle2" sx={{ color: 'common.white' }}>
              Chat with Friends
            </Typography>
          </Stack>
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

        <Collapse in={open}>
          <Stack sx={{ p: 1.5, pt: 0 }} spacing={1.25}>
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
              />
            )}

            {/* {authenticated && user && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <CoffeeShopChatAvatar
                  photoKeyOrUrl={user.photoURL}
                  name={String(user.displayName || user.email || 'Member')}
                  size={28}
                />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                  Sending as {user.displayName || user.email || 'Member'}
                </Typography>
              </Stack>
            )} */}

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
              {messages.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', py: 1 }}>
                  No messages yet. Say hello.
                </Typography>
              ) : (
                messages.map((m) => {
                  const isSystem = m.kind === 'system';

                  return (
                    <Stack key={m.id} direction="row" spacing={1.25} alignItems="flex-start">
                      <CoffeeShopChatAvatar
                        photoKeyOrUrl={m.authorAvatar}
                        name={m.authorName}
                        size={32}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        {!isSystem && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                            {m.authorName}
                            {m.sentAt
                              ? ` · ${new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : ''}
                          </Typography>
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
              disabled={!hasClientPusherConfig}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) {
                  return;
                }
                if (e.nativeEvent.isComposing) {
                  return;
                }
                if (e.repeat) {
                  return;
                }
                e.preventDefault();
                handleSend();
              }}
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
                      edge="end"
                      onClick={() => handleSend()}
                      disabled={sending || !draft.trim() || !hasClientPusherConfig}
                      sx={{ color: 'primary.main' }}
                    >
                      <Iconify icon="eva:paper-plane-fill" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={[chatTextFieldSx, { '& .MuiInputBase-root': { alignItems: 'flex-start' } }]}
            />
          </Stack>
        </Collapse>
      </Paper>
    </Box>
  );

  return createPortal(panel, portalTarget);
}
