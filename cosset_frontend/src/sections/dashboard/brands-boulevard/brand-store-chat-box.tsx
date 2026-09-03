'use client';

import type { IChatMessage, IChatParticipant } from 'src/types/chat';

import { createPortal } from 'react-dom';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { uuidv4 } from 'src/utils/uuidv4';
import { today } from 'src/utils/format-time';

import {
  sendMessage,
  addChatContact,
  clickConversation,
  useGetConversation,
} from 'src/actions/chat';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import {
  EmoticonPickerGrid,
  insertTextAtSelection,
  InputEmoticonSuggestion,
} from 'src/components/dashboard/emoticon-picker';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  ownerCustomerId: string;
  shopName: string;
  ownerName: string;
  ownerAvatarUrl?: string;
};

export function BrandStoreChatBox({
  open,
  onClose,
  onOpen,
  ownerCustomerId,
  shopName,
  ownerName,
  ownerAvatarUrl,
}: Props) {
  const { user } = useAuthContext();
  const [conversationId, setConversationId] = useState('');
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [emoticonsOpen, setEmoticonsOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { conversation, conversationLoading } = useGetConversation(
    open ? conversationId : '',
    open && conversationId ? { refreshIntervalMs: 2500 } : undefined,
  );

  const myContact = useMemo<IChatParticipant>(
    () => ({
      id: `${user?.id || ''}`,
      role: `${user?.role || ''}`,
      email: `${user?.email || ''}`,
      address: `${user?.address || ''}`,
      name: `${user?.displayName || 'You'}`,
      lastActivity: today(),
      avatarUrl: `${user?.photoURL || ''}`,
      phoneNumber: `${user?.phoneNumber || ''}`,
      status: 'online',
    }),
    [user],
  );

  const sellerContact = useMemo<IChatParticipant>(
    () => ({
      id: ownerCustomerId,
      role: 'business',
      email: '',
      address: '',
      name: ownerName || shopName || 'Shop owner',
      lastActivity: today(),
      avatarUrl: ownerAvatarUrl || '',
      phoneNumber: '',
      status: 'online',
    }),
    [ownerAvatarUrl, ownerCustomerId, ownerName, shopName],
  );

  const messages = conversation?.messages || [];

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open || !user?.id || !ownerCustomerId) return undefined;

    let cancelled = false;

    const startConversation = async () => {
      try {
        setStarting(true);
        const result = await addChatContact(ownerCustomerId);
        const nextId = String(result?.conversation?.id || '').trim();
        if (cancelled) return;

        if (!nextId) {
          toast.error('Unable to start a chat with this shop');
          return;
        }

        setConversationId(nextId);
        clickConversation(nextId).catch(() => undefined);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to open shop chat');
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    startConversation();

    return () => {
      cancelled = true;
    };
  }, [open, ownerCustomerId, user?.id]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, open]);

  useEffect(() => {
    if (!open) setEmoticonsOpen(false);
  }, [open]);

  const applyDraftValue = useCallback((nextValue: string, nextCaret?: number) => {
    setDraft(nextValue);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      const caret = typeof nextCaret === 'number' ? nextCaret : nextValue.length;
      input.setSelectionRange(caret, caret);
    });
  }, []);

  const insertEmoticon = useCallback(
    (emoticon: string) => {
      const input = inputRef.current;
      const start = input?.selectionStart ?? draft.length;
      const end = input?.selectionEnd ?? draft.length;
      const next = insertTextAtSelection(draft, emoticon, start, end);
      applyDraftValue(next.nextValue, next.nextCaret);
      setEmoticonsOpen(false);
    },
    [applyDraftValue, draft],
  );

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body || !conversationId || sending || !user?.id) return;

    try {
      setSending(true);
      const messageData: IChatMessage = {
        id: uuidv4(),
        attachments: [],
        body,
        contentType: 'text',
        createdAt: today(),
        senderId: String(user.id),
      };
      await sendMessage(conversationId, messageData);
      setDraft('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [conversationId, draft, sending, user?.id]);

  if (!portalTarget || !user?.id) {
    return null;
  }

  const panel = (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, sm: 24 },
        bottom: { xs: 12, sm: 24 },
        zIndex: (theme) => theme.zIndex.snackbar,
        width: { xs: 'calc(100vw - 24px)', sm: 360 },
        maxWidth: 420,
        pointerEvents: 'auto',
      }}
    >
      {!open ? (
        <Button
          variant="contained"
          color="primary"
          onClick={onOpen}
          startIcon={<Iconify icon="solar:chat-round-dots-bold" width={20} />}
          sx={{
            borderRadius: 999,
            px: 2.25,
            py: 1.25,
            boxShadow: 8,
            fontWeight: 700,
          }}
        >
          Chat with shop
        </Button>
      ) : (
        <Paper
          elevation={12}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'rgba(15, 20, 28, 0.92)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            flexDirection: 'column',
            height: { xs: 'min(70dvh, 520px)', sm: 480 },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{
              px: 1.5,
              py: 1.25,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <Avatar
                src={ownerAvatarUrl || undefined}
                alt={ownerName}
                sx={{ width: 32, height: 32, fontSize: 14 }}
              >
                {(ownerName || shopName || 'S').charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap sx={{ color: 'common.white' }}>
                  Chat with {shopName}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.65)' }}>
                  {ownerName}
                </Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={onClose} sx={{ color: 'common.white' }} aria-label="Close chat">
              <Iconify icon="mingcute:close-line" width={20} />
            </IconButton>
          </Stack>

          <Box
            ref={listRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 1.5,
              py: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
            }}
          >
            {starting || conversationLoading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 4 }}>
                <CircularProgress size={28} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                  Opening chat...
                </Typography>
              </Stack>
            ) : messages.length ? (
              messages.map((message) => {
                const isMine = String(message.senderId) === String(myContact.id);
                const sender = isMine
                  ? myContact
                  : conversation?.participants?.find((p) => String(p.id) === String(message.senderId)) ||
                    sellerContact;

                return (
                  <Stack
                    key={message.id}
                    direction="row"
                    spacing={1}
                    justifyContent={isMine ? 'flex-end' : 'flex-start'}
                    alignItems="flex-end"
                  >
                    {!isMine ? (
                      <Avatar
                        src={sender.avatarUrl || undefined}
                        alt={sender.name}
                        sx={{ width: 28, height: 28, fontSize: 12 }}
                      >
                        {(sender.name || 'S').charAt(0).toUpperCase()}
                      </Avatar>
                    ) : null}
                    <Box
                      sx={{
                        maxWidth: '78%',
                        px: 1.25,
                        py: 1,
                        borderRadius: 1.5,
                        bgcolor: isMine ? 'primary.main' : 'rgba(255,255,255,0.1)',
                        color: 'common.white',
                      }}
                    >
                      {!isMine ? (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', mb: 0.25, opacity: 0.75, fontWeight: 600 }}
                        >
                          {sender.name}
                        </Typography>
                      ) : null}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {message.body}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 4, px: 2 }}>
                <Iconify
                  icon="solar:chat-round-dots-bold"
                  width={28}
                  sx={{ color: 'rgba(255,255,255,0.55)', mb: 1 }}
                />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
                  Ask the seller about products while you keep browsing this shop.
                </Typography>
              </Stack>
            )}
          </Box>

          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 1.25 }}>
            {emoticonsOpen ? (
              <Box
                sx={{
                  mb: 1,
                  maxHeight: 120,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  pr: 0.5,
                }}
              >
                <EmoticonPickerGrid
                  onSelect={insertEmoticon}
                  buttonSx={{
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.18)',
                    minWidth: 34,
                    minHeight: 34,
                    p: 0.5,
                  }}
                />
              </Box>
            ) : null}

            <Stack direction="row" spacing={0.75} alignItems="flex-end">
              <IconButton
                size="small"
                disabled={starting || sending || !conversationId}
                onClick={() => setEmoticonsOpen((value) => !value)}
                aria-label={emoticonsOpen ? 'Hide emoticons' : 'Show emoticons'}
                aria-pressed={emoticonsOpen}
                sx={{
                  color: emoticonsOpen ? 'primary.light' : 'rgba(255,255,255,0.85)',
                  border: '1px solid',
                  borderColor: emoticonsOpen ? 'primary.light' : 'rgba(255,255,255,0.18)',
                }}
              >
                <Iconify icon="eva:smiling-face-fill" width={20} />
              </IconButton>
              <InputBase
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={4}
                value={draft}
                autoFocus={open}
                disabled={starting || sending || !conversationId}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (suggestionOpen) return;
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message the shop..."
                inputProps={{
                  style: {
                    color: '#ffffff',
                    caretColor: '#ffffff',
                    WebkitTextFillColor: '#ffffff',
                  },
                }}
                sx={{
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  fontSize: 14,
                  '& textarea': {
                    color: '#ffffff !important',
                    caretColor: '#ffffff !important',
                    WebkitTextFillColor: '#ffffff !important',
                  },
                  '& textarea::placeholder': {
                    color: 'rgba(255,255,255,0.55)',
                    opacity: 1,
                  },
                }}
              />
              <IconButton
                color="primary"
                disabled={!draft.trim() || sending || !conversationId}
                onClick={handleSend}
                aria-label="Send message"
              >
                <Iconify icon="solar:plain-2-bold" width={22} />
              </IconButton>
            </Stack>
            <InputEmoticonSuggestion
              inputRef={inputRef}
              value={draft}
              disabled={starting || sending || !conversationId}
              onChange={applyDraftValue}
              onOpenChange={setSuggestionOpen}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );

  return createPortal(panel, portalTarget);
}
