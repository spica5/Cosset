'use client';

import type { CoffeeShopChatMessage, CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';

import { createPortal } from 'react-dom';

import { useRef, useMemo, useState, useEffect, useCallback, type KeyboardEvent } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputAdornment from '@mui/material/InputAdornment';

import { CONFIG } from 'src/config-global';

import {
  joinCoffeeShopPresence,
  touchCoffeeShopActivity,
  leaveCoffeeShopPresence,
  fetchCoffeeShopChatToday,
  sendCoffeeShopChatMessage,
  deleteCoffeeShopChatMessage,
  coffeeShopActivityStorageKey, 
} from 'src/actions/coffee-shop';

import { isUserAdmin } from 'src/auth/utils/role';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { playChatNotificationSound } from 'src/utils/chat-notification-sound';
import { formatCoffeeShopChatSentAt } from 'src/utils/format-time';
import { uuidv4 } from 'src/utils/uuidv4';
import { getS3SignedUrl } from 'src/utils/helper';

import { useGetFriends } from 'src/actions/friend';
import { uploadFileToS3 } from 'src/actions/upload';
import { Iconify } from 'src/components/universe/iconify';
import { GLOBAL_EMOTICON_OPTIONS } from 'src/constants/emoticons';

import Pusher from 'pusher-js';

import { CoffeeShopChatAvatar } from 'src/sections/universe/community/coffee-shop-chat-avatar';

import {
  COFFEE_SHOP_CHAT_EVENT,
  COFFEE_SHOP_CHAT_DELETED_EVENT,
  COFFEE_SHOP_PARTICIPANT_JOINED_EVENT,
  COFFEE_SHOP_PARTICIPANT_LEFT_EVENT,
} from 'src/types/coffee-shop-chat';

import {
  COFFEE_SHOP_MOBILE_PANEL_EVENT,
  closeCoffeeShopMobilePanel,
  coffeeShopMobileChatFormBoxSx,
  type CoffeeShopMobilePanel,
} from './coffee-shop-mobile-panels';

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

function isImageMimeType(mimeType?: string | null) {
  return Boolean(mimeType && mimeType.toLowerCase().startsWith('image/'));
}

async function downloadChatAttachment(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function downloadPendingFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function ChatMessageAttachment({
  message,
  resolvedUrl,
}: {
  message: CoffeeShopChatMessage;
  resolvedUrl: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const fileName = message.fileName || message.text || 'Attachment';
  const isImage = isImageMimeType(message.mimeType) || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fileName);

  const handleDownload = async () => {
    if (!resolvedUrl || downloading) {
      return;
    }

    setDownloading(true);
    try {
      await downloadChatAttachment(resolvedUrl, fileName);
    } finally {
      setDownloading(false);
    }
  };

  if (!resolvedUrl) {
    return (
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
        Loading attachment…
      </Typography>
    );
  }

  if (isImage) {
    return (
      <Box sx={{ position: 'relative', display: 'inline-block', mt: 0.5, maxWidth: '100%' }}>
        <Box
          component="img"
          src={resolvedUrl}
          alt={fileName}
          sx={{
            maxWidth: '100%',
            maxHeight: 180,
            borderRadius: 1,
            display: 'block',
            objectFit: 'cover',
          }}
        />
        <Tooltip title="Download">
          <span>
            <IconButton
              size="small"
              onClick={() => handleDownload()}
              disabled={downloading}
              aria-label="Download attachment"
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                bgcolor: 'rgba(0,0,0,0.55)',
                color: 'common.white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
              }}
            >
              <Iconify icon="mingcute:download-line" width={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, minWidth: 0 }}>
      <Link
        href={resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color: 'info.light',
          fontSize: 13,
          wordBreak: 'break-all',
          minWidth: 0,
          flex: 1,
        }}
      >
        <Iconify icon="eva:attach-2-fill" width={16} />
        {fileName}
      </Link>
      <Tooltip title="Download">
        <span>
          <IconButton
            size="small"
            onClick={() => handleDownload()}
            disabled={downloading}
            aria-label="Download attachment"
            sx={{
              color: 'info.light',
              flexShrink: 0,
              '&:hover': { color: 'common.white' },
            }}
          >
            <Iconify icon="mingcute:download-line" width={16} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

type ChatProps = {
  coffeeShopId: string;
  participants?: CoffeeShopChatParticipant[];
  onParticipantsLoaded?: (participants: CoffeeShopChatParticipant[]) => void;
  onParticipantJoin?: (participant: CoffeeShopChatParticipant) => void;
  onParticipantLeave?: (userId: string) => void;
  onPresenceLoadingChange?: (loading: boolean) => void;
  isPresent?: boolean;
  isHidden?: boolean;
  selectedPrivateReceiverId?: string | null;
  onSelectPrivateReceiver?: (participant: CoffeeShopChatParticipant) => void;
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
  participants = [],
  onParticipantsLoaded,
  onParticipantJoin,
  onParticipantLeave,
  onPresenceLoadingChange,
  isPresent = true,
  isHidden = false,
  selectedPrivateReceiverId,
  onSelectPrivateReceiver,
  onSystemNotification,
}: ChatProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { authenticated, user, loading: authLoading } = useAuthContext();
  const channelName = useMemo(() => channelNameForShop(coffeeShopId), [coffeeShopId]);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CoffeeShopChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [guestName, setGuestName] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'public' | 'friend' | 'private'>('public');
  const [emoticonsOpen, setEmoticonsOpen] = useState(false);
  const [participantStatusVersion, setParticipantStatusVersion] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [resolvedFileUrls, setResolvedFileUrls] = useState<Record<string, string>>({});

  const listRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const sendInFlightRef = useRef(false);
  const onParticipantJoinRef = useRef(onParticipantJoin);
  onParticipantJoinRef.current = onParticipantJoin;
  const participantsRef = useRef<CoffeeShopChatParticipant[]>([]);

  const hasClientPusherConfig = Boolean(CONFIG.pusher.key && CONFIG.pusher.cluster);

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // load accepted friends for current user so we can mark friend avatars
  const userIdStr = user?.id != null ? String(user.id) : undefined;
  const canManageChat = isUserAdmin(user?.role);
  const { friends: acceptedFriends } = useGetFriends(userIdStr, 'accepted', Boolean(userIdStr));
  const selectedPrivateReceiverKey = selectedPrivateReceiverId?.trim().toLowerCase() || '';
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

  const privateFriendParticipants = useMemo(
    () =>
      participants.filter((p) => {
        const participantId = p.userId.trim().toLowerCase();
        return (
          participantId &&
          !p.leftAt &&
          participantId !== userIdStr?.toLowerCase() &&
          friendIdSet.has(participantId)
        );
      }),
    [friendIdSet, participants, userIdStr],
  );

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      return undefined;
    }

    const handleMobilePanelChange = (event: Event) => {
      const panel = (event as CustomEvent<CoffeeShopMobilePanel>).detail;
      setOpen(panel === 'chat');
    };

    window.addEventListener(COFFEE_SHOP_MOBILE_PANEL_EVENT, handleMobilePanelChange);

    return () => {
      window.removeEventListener(COFFEE_SHOP_MOBILE_PANEL_EVENT, handleMobilePanelChange);
    };
  }, [isMobile]);

  const handleClosePanel = useCallback(() => {
    if (isMobile) {
      closeCoffeeShopMobilePanel();
      return;
    }

    setOpen(false);
  }, [isMobile]);

  const resolvedFileIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const resolveFileUrls = async () => {
      const fileMessages = messages.filter(
        (m) =>
          m.messageType === 'file' &&
          m.fileUrl &&
          !resolvedFileIdsRef.current.has(m.id),
      );

      if (!fileMessages.length) {
        return;
      }

      const entries = await Promise.all(
        fileMessages.map(async (m) => {
          const key = String(m.fileUrl || '').trim();
          if (!key) {
            return null;
          }
          if (key.startsWith('http://') || key.startsWith('https://')) {
            return [m.id, key] as const;
          }
          const url = (await getS3SignedUrl(key)) || '';
          return url ? ([m.id, url] as const) : null;
        }),
      );

      if (!cancelled) {
        const next: Record<string, string> = {};
        entries.forEach((entry) => {
          if (entry) {
            resolvedFileIdsRef.current.add(entry[0]);
            next[entry[0]] = entry[1];
          }
        });
        if (Object.keys(next).length) {
          setResolvedFileUrls((prev) => ({ ...prev, ...next }));
        }
      }
    };

    resolveFileUrls();

    return () => {
      cancelled = true;
    };
  }, [messages]);

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

  const removeMessage = useCallback((messageId: string) => {
    const key = messageId.trim();
    if (!key) {
      return;
    }
    seenIds.current.delete(key);
    setMessages((prev) => prev.filter((m) => m.id !== key));
    setResolvedFileUrls((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
    resolvedFileIdsRef.current.delete(key);
  }, []);

  const canDeleteMessage = useCallback(
    (message: CoffeeShopChatMessage) => {
      if (!authenticated || message.kind === 'system') {
        return false;
      }
      if (canManageChat) {
        return true;
      }
      const authorId = message.userId?.trim().toLowerCase();
      const currentUserId = userIdStr?.trim().toLowerCase();
      return Boolean(authorId && currentUserId && authorId === currentUserId);
    },
    [authenticated, canManageChat, userIdStr],
  );

  const handleDeleteMessage = useCallback(
    async (message: CoffeeShopChatMessage) => {
      if (!canDeleteMessage(message) || deletingMessageId) {
        return;
      }

      setDeletingMessageId(message.id);
      setSendError(null);

      try {
        await deleteCoffeeShopChatMessage(coffeeShopId, message.id);
        removeMessage(message.id);
      } catch (err: unknown) {
        let msg = 'Could not delete message.';
        if (typeof err === 'string') {
          msg = err;
        } else if (err instanceof Error) {
          msg = err.message;
        } else if (err && typeof err === 'object') {
          const data = err as { message?: unknown };
          if (typeof data.message === 'string') {
            msg = data.message;
          }
        }
        setSendError(msg);
      } finally {
        setDeletingMessageId(null);
      }
    },
    [canDeleteMessage, coffeeShopId, deletingMessageId, removeMessage],
  );

  const appendMessage = useCallback(
    (msg: CoffeeShopChatMessage) => {
      if (!msg?.id || seenIds.current.has(msg.id)) {
        return;
      }

      if (msg.chatMode === 'private') {
        const currentUserId = userIdStr?.toLowerCase();
        const authorId = msg.userId?.trim().toLowerCase();
        const receiverId = msg.receiverId?.trim().toLowerCase();
        if (!currentUserId || (authorId !== currentUserId && receiverId !== currentUserId)) {
          return;
        }
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

      const authorId = msg.userId?.trim().toLowerCase();
      const currentUserId = userIdStr?.trim().toLowerCase();
      const isOwnMessage = Boolean(authorId && currentUserId && authorId === currentUserId);
      if (!isOwnMessage) {
        playChatNotificationSound();
      }

      if (authorId) {
        const existing = participantsRef.current.find(
          (p) => p.userId.trim().toLowerCase() === authorId,
        );
        if (existing?.leftAt) {
          const { leftAt: _leftAt, ...reactivated } = existing;
          onParticipantJoinRef.current?.(reactivated);
          participantsRef.current = participantsRef.current.map((p) =>
            p.userId.trim().toLowerCase() === authorId ? reactivated : p,
          );
          setParticipantStatusVersion((v) => v + 1);
        }
      }
    },
    [onSystemNotification, userIdStr],
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
      setParticipantStatusVersion((v) => v + 1);
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
          touchCoffeeShopActivity(coffeeShopId);
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
          window.localStorage.removeItem(coffeeShopActivityStorageKey(coffeeShopId));
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
    participantsRef.current = participants;
  }, [participants]);

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

    channel.bind(COFFEE_SHOP_CHAT_DELETED_EVENT, (data: { id?: string }) => {
      const messageId = data?.id?.trim();
      if (messageId) {
        removeMessage(messageId);
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
      channel.unbind(COFFEE_SHOP_CHAT_DELETED_EVENT);
      channel.unbind(COFFEE_SHOP_PARTICIPANT_JOINED_EVENT);
      channel.unbind(COFFEE_SHOP_PARTICIPANT_LEFT_EVENT);
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [appendMessage, channelName, hasClientPusherConfig, onParticipantLeave, onSystemNotification, removeMessage]);

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
        const receiverId = m.receiverId?.trim().toLowerCase();

        if (!currentUserId || m.chatMode !== 'private') {
          return false;
        }

        if (!selectedPrivateReceiverKey) {
          return messageAuthorId === currentUserId || receiverId === currentUserId;
        }

        return (
          (messageAuthorId === currentUserId && receiverId === selectedPrivateReceiverKey) ||
          (messageAuthorId === selectedPrivateReceiverKey && receiverId === currentUserId)
        );
      });
    }

    return [];
  }, [chatMode, messages, friendIdSet, selectedPrivateReceiverKey, userIdStr]);

  const selectedPrivateReceiverName = useMemo(() => {
    if (!selectedPrivateReceiverKey) {
      return '';
    }

    return (
      participants.find((p) => p.userId.trim().toLowerCase() === selectedPrivateReceiverKey)?.name ||
      participantsRef.current.find((p) => p.userId.trim().toLowerCase() === selectedPrivateReceiverKey)
        ?.name ||
      ''
    );
  }, [participantStatusVersion, participants, selectedPrivateReceiverKey]);

  useEffect(() => {
    if (selectedPrivateReceiverKey) {
      setChatMode('private');
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

  const chatModeTitle =
    chatMode === 'public'
      ? 'Chat (Public)'
      : chatMode === 'friend'
      ? 'Chat (Friends)'
      : selectedPrivateReceiverName
      ? `Chat (${selectedPrivateReceiverName})`
      : 'Chat (Private)';

  const emptyMessageLabel =
    chatMode === 'friend'
      ? 'No messages from friends. Connect with friends to see their messages.'
      : chatMode === 'private'
      ? selectedPrivateReceiverName
        ? `No private messages with ${selectedPrivateReceiverName} yet.`
        : 'Select a friend for private chat.'
      : 'No public messages yet. Say hello.';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setPendingFile(file);
    setSendError(null);
    event.target.value = '';
  };

  const handleSend = async () => {
    if (sendInFlightRef.current) {
      return;
    }

    const text = draft.trim();
    if ((!text && !pendingFile) || !channelName) {
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

    if (chatMode === 'private' && !selectedPrivateReceiverId) {
      setSendError('Select a friend for private chat.');
      return;
    }

    sendInFlightRef.current = true;
    setSendError(null);
    setSending(true);
    touchCoffeeShopActivity(coffeeShopId);
    const savedDraft = text;
    const savedFile = pendingFile;
    setDraft('');
    setPendingFile(null);

    try {
      let filePayload:
        | {
            messageType: 'file';
            fileUrl: string;
            fileName: string;
            mimeType: string;
          }
        | undefined;

      if (savedFile) {
        if (!authenticated || !user?.id) {
          throw new Error('Sign in to send files.');
        }

        setUploadingFile(true);
        const ext = savedFile.name.split('.').pop()?.toLowerCase() || 'bin';
        const ownerSegment = String(user.id);
        const key = `coffee-shops/${ownerSegment}/${coffeeShopId}/chat/${uuidv4()}.${ext}`;
        const uploaded = await uploadFileToS3({ file: savedFile, key, isPublic: false });
        filePayload = {
          messageType: 'file',
          fileUrl: uploaded.key,
          fileName: savedFile.name,
          mimeType: savedFile.type || 'application/octet-stream',
        };
      }

      const res = await sendCoffeeShopChatMessage(coffeeShopId, {
        message: savedDraft || savedFile?.name || 'Attachment',
        displayName: authenticated ? undefined : guestName.trim(),
        chatMode,
        receiverId: chatMode === 'private' ? selectedPrivateReceiverId : null,
        ...filePayload,
      });

      const incoming = res?.chatMessage as CoffeeShopChatMessage | undefined;
      if (incoming) {
        appendMessage(incoming);
      }
      if (!authenticated) {
        persistGuestName(guestName);
      }
    } catch (err: unknown) {
      setDraft(savedDraft);
      setPendingFile(savedFile);
      let msg = 'Could not send message.';
      if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message;
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
      setUploadingFile(false);
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

  if (isMobile && !open) {
    return null;
  }

  const panel = (
    <Box
      sx={{
        position: 'fixed',
        left: { xs: coffeeShopMobileChatFormBoxSx.left, sm: 'auto' },
        right: { xs: coffeeShopMobileChatFormBoxSx.right, sm: 24 },
        bottom: { xs: coffeeShopMobileChatFormBoxSx.bottom, sm: 24 },
        zIndex: (tm) => tm.zIndex.snackbar,
        maxWidth: '100%',
        width: { xs: coffeeShopMobileChatFormBoxSx.width, sm: 360 },
        maxHeight: { xs: coffeeShopMobileChatFormBoxSx.maxHeight, sm: 'none' },
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
          spacing={0.5}
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
            cursor: isMobile ? 'default' : 'pointer',
            minWidth: 0,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={isMobile ? undefined : () => setOpen((v) => !v)}
            sx={{ minWidth: 0, flex: 1 }}
          >
            <Iconify icon="solar:chat-round-dots-bold" width={22} sx={{ color: 'common.white', flexShrink: 0 }} />
            <Typography variant="subtitle2" noWrap sx={{ color: 'common.white', minWidth: 0 }}>
              {chatModeTitle}
            </Typography>
          </Stack>

          {/* Chat Mode Selector - Icon Buttons */}
            <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
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
                title="Private - Select a friend"
              >
                <Iconify icon="eva:lock-fill" width={20} />
              </IconButton>

              <IconButton
                size="small"
                sx={{ color: 'common.white' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMobile) {
                    handleClosePanel();
                  } else {
                    setOpen((v) => !v);
                  }
                }}
                aria-label={isMobile ? 'Close chat' : open ? 'Collapse chat' : 'Expand chat'}
              >
                <Iconify
                  icon={isMobile ? 'mingcute:close-line' : open ? 'eva:arrow-down-fill' : 'eva:arrow-up-fill'}
                  width={20}
                />
              </IconButton>
            </Stack>

          
        </Stack>

        <Collapse in={isMobile ? true : open}>
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

            {chatMode === 'private' && authenticated && (
              <Stack spacing={0.75}>
                {privateFriendParticipants.length > 0 ? (
                  <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5, pr: 0.5 }}>
                    {privateFriendParticipants.map((participant) => {
                      const participantId = participant.userId.trim().toLowerCase();
                      const isSelected = participantId === selectedPrivateReceiverKey;

                      return (
                        <Tooltip key={participant.userId} title={participant.name} placement="top">
                          <Stack
                            alignItems="center"
                            spacing={0.5}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectPrivateReceiver?.(participant)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectPrivateReceiver?.(participant);
                              }
                            }}
                            sx={{
                              flex: '0 0 auto',
                              width: 54,
                              cursor: 'pointer',
                              borderRadius: 1.5,
                              p: 0.5,
                              boxSizing: 'border-box',
                              border: '2px solid',
                              borderColor: isSelected
                                ? 'rgba(255, 100, 100, 0.86)'
                                : 'rgba(255,255,255,0.14)',
                            }}
                          >
                            <CoffeeShopChatAvatar
                              photoKeyOrUrl={participant.photoURL}
                              name={participant.name}
                              size={38}
                              showTooltip={false}
                              status="online"
                              isFriend
                            />
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                width: '100%',
                                color: isSelected ? 'error.light' : 'rgba(255,255,255,0.62)',
                                fontSize: 10,
                                lineHeight: 1,
                                textAlign: 'center',
                              }}
                            >
                              {participant.name}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', py: 0.5 }}>
                    No friends are in this coffee shop right now.
                  </Typography>
                )}
              </Stack>
            )}
            
            <Box
              ref={listRef}
              sx={{
                maxHeight: { xs: '38vh', sm: 220 },
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
                  const participant = participants.find(
                    (p) => p.userId.trim().toLowerCase() === messageAuthorId,
                  );
                  const status =
                    isCurrentUser && isPresent
                      ? 'online'
                      : participant
                        ? !participant.leftAt
                          ? 'online'
                          : 'left'
                        : undefined;
                  const showDelete = canDeleteMessage(m);

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
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.75}
                            sx={{ mb: 0.25, minWidth: 0 }}
                          >
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{ color: 'rgba(255,255,255,0.55)', flex: 1, minWidth: 0 }}
                            >
                              {m.authorName}
                              {m.sentAt ? ` · ${formatCoffeeShopChatSentAt(m.sentAt)}` : ''}
                            </Typography>
                            {m.chatMode && m.chatMode !== 'public' ? (
                              <Chip
                                label={m.chatMode === 'friend' ? '👥' : '🔒'}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 18,
                                  fontSize: '0.625rem',
                                  borderColor: 'rgba(255,255,255,0.3)',
                                  color:
                                    m.chatMode === 'private'
                                      ? 'rgba(255, 100, 100, 0.8)'
                                      : 'rgba(100, 200, 255, 0.8)',
                                }}
                              />
                            ) : null}
                            {showDelete ? (
                              <Tooltip title="Delete message">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteMessage(m)}
                                    disabled={Boolean(deletingMessageId) || !isPresent || isHidden}
                                    sx={{
                                      color: 'rgba(255,255,255,0.55)',
                                      p: 0.25,
                                      '&:hover': { color: 'error.light' },
                                    }}
                                    aria-label="Delete message"
                                  >
                                    <Iconify icon="solar:trash-bin-trash-bold" width={14} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : null}
                          </Stack>
                        )}
                        {m.messageType === 'file' && m.fileUrl ? (
                          <ChatMessageAttachment
                            message={m}
                            resolvedUrl={resolvedFileUrls[m.id] || ''}
                          />
                        ) : null}
                        {m.text && (m.messageType !== 'file' || m.text !== (m.fileName || '')) ? (
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
                        ) : null}
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

            {pendingFile ? (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <Iconify icon="eva:attach-2-fill" width={18} sx={{ color: 'common.white' }} />
                <Typography variant="caption" noWrap sx={{ color: 'common.white', flex: 1 }}>
                  {pendingFile.name}
                </Typography>
                <Tooltip title="Download">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => downloadPendingFile(pendingFile)}
                      disabled={sending || uploadingFile}
                      sx={{ color: 'common.white' }}
                      aria-label="Download attachment"
                    >
                      <Iconify icon="mingcute:download-line" width={16} />
                    </IconButton>
                  </span>
                </Tooltip>
                <IconButton
                  size="small"
                  onClick={() => setPendingFile(null)}
                  disabled={sending || uploadingFile}
                  sx={{ color: 'common.white' }}
                  aria-label="Remove attachment"
                >
                  <Iconify icon="mingcute:close-line" width={16} />
                </IconButton>
              </Stack>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.txt,.zip"
              onChange={handleFileSelect}
            />

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
                  <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1, mr: 1 }}>
                    {authenticated ? (
                      <IconButton
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={
                          sending ||
                          uploadingFile ||
                          !hasClientPusherConfig ||
                          !isPresent ||
                          isHidden
                        }
                        sx={{ color: 'common.white' }}
                        aria-label="Attach file"
                      >
                        <Iconify icon="eva:attach-2-fill" width={18} />
                      </IconButton>
                    ) : null}
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
                      disabled={
                        sending ||
                        uploadingFile ||
                        (!draft.trim() && !pendingFile) ||
                        !hasClientPusherConfig ||
                        !isPresent ||
                        isHidden
                      }
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
              {authenticated
                ? 'Attach a file, press : or Ctrl+E for emoticons, Enter to send.'
                : 'Press : or Ctrl+E to open emoticons, Enter to send.'}
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
