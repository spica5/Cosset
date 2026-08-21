'use client';

import type { ChatCallSession, ChatCallMediaType, ChatCallSignalPayload } from 'src/types/chat-call';

import { mutate } from 'swr';
import Pusher from 'pusher-js';
import {
  useRef,
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { endpoints } from 'src/utils/axios';
import { getS3SignedUrl } from 'src/utils/helper';
import { playChatNotificationSound } from 'src/utils/chat-notification-sound';

import { CONFIG } from 'src/config-global';
import {
  endChatCall,
  acceptChatCall,
  inviteChatCall,
  rejectChatCall,
} from 'src/actions/chat-call';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { ChatWebRtcSession } from './utils/chat-webrtc-session';

// ----------------------------------------------------------------------

const RING_TIMEOUT_MS = 45_000;

const USER_CALL_INVITE_EVENT = 'call-invite';
const USER_CALL_ACCEPTED_EVENT = 'call-accepted';
const USER_CALL_REJECTED_EVENT = 'call-rejected';
const USER_CALL_SIGNAL_EVENT = 'call-signal';
const USER_CALL_ENDED_EVENT = 'call-ended';

function userCallChannel(userId: string) {
  return `user-call-${userId.trim().toLowerCase()}`;
}

type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active';

type ChatCallContextValue = {
  phase: CallPhase;
  activeCall: ChatCallSession | null;
  muted: boolean;
  cameraOff: boolean;
  startCall: (input: {
    conversationId: string;
    calleeId: string;
    mediaType: ChatCallMediaType;
    peerName?: string;
    peerAvatarUrl?: string;
  }) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  rejectIncoming: () => Promise<void>;
  endActiveCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
};

const ChatCallContext = createContext<ChatCallContextValue | null>(null);

export function useChatCall() {
  const value = useContext(ChatCallContext);
  if (!value) {
    throw new Error('useChatCall must be used within ChatCallProvider');
  }
  return value;
}

export function useChatCallOptional() {
  return useContext(ChatCallContext);
}

async function resolveAvatarUrl(raw?: string | null) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }
  if (value.startsWith('public:')) {
    return value.replace(/^public:/, '');
  }
  return (await getS3SignedUrl(value)) || '';
}

function refreshConversation(conversationId?: string | null) {
  if (!conversationId) return;
  mutate([endpoints.chat, { params: { conversationId, endpoint: 'conversation' } }]);
  mutate([endpoints.chat, { params: { endpoint: 'conversations' } }]);
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function CallAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    resolveAvatarUrl(avatarUrl).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  return (
    <Avatar src={src || undefined} alt={name} sx={{ width: 96, height: 96, fontSize: 36 }}>
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

export function ChatCallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const userId = user?.id ? String(user.id).trim().toLowerCase() : '';

  const [phase, setPhase] = useState<CallPhase>('idle');
  const [activeCall, setActiveCall] = useState<ChatCallSession | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const sessionRef = useRef<ChatWebRtcSession | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef<CallPhase>('idle');
  const activeCallRef = useRef<ChatCallSession | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current != null) {
      window.clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const clearElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current != null) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(async () => {
    clearRingTimer();
    clearElapsedTimer();
    setElapsedSec(0);
    setMuted(false);
    setCameraOff(false);
    await sessionRef.current?.dispose();
    sessionRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, [clearElapsedTimer, clearRingTimer]);

  const resetCallState = useCallback(async () => {
    const conversationId = activeCallRef.current?.conversationId;
    await cleanupMedia();
    setActiveCall(null);
    setPhase('idle');
    refreshConversation(conversationId);
  }, [cleanupMedia]);

  const startElapsed = useCallback(() => {
    clearElapsedTimer();
    setElapsedSec(0);
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSec((value) => value + 1);
    }, 1000);
  }, [clearElapsedTimer]);

  const ensureSession = useCallback(
    (call: ChatCallSession) => {
      if (sessionRef.current) {
        return sessionRef.current;
      }

      const isPolite = call.calleeId === userId;
      const session = new ChatWebRtcSession({
        callId: call.id,
        mediaType: call.mediaType,
        isPolite,
        callbacks: {
          onLocalStream: setLocalStream,
          onRemoteStream: setRemoteStream,
          onConnectionStateChange: (state) => {
            if (state === 'connected') {
              setPhase('active');
            }
            if (state === 'failed') {
              toast.error('Call connection failed.');
            }
          },
          onError: (error) => {
            console.error('[ChatCall] WebRTC error', error);
          },
        },
      });
      sessionRef.current = session;
      return session;
    },
    [userId],
  );

  const startCall = useCallback(
    async (input: {
      conversationId: string;
      calleeId: string;
      mediaType: ChatCallMediaType;
      peerName?: string;
      peerAvatarUrl?: string;
    }) => {
      if (!userId) {
        toast.error('Sign in to start a call.');
        return;
      }
      if (phaseRef.current !== 'idle') {
        toast.error('You are already in a call.');
        return;
      }

      try {
        const call = await inviteChatCall({
          conversationId: input.conversationId,
          calleeId: input.calleeId,
          mediaType: input.mediaType,
        });

        const enriched: ChatCallSession = {
          ...call,
          peer: call.peer || {
            id: input.calleeId,
            name: input.peerName || 'Member',
            avatarUrl: input.peerAvatarUrl || '',
          },
        };

        setActiveCall(enriched);
        setPhase('outgoing');
        setCameraOff(input.mediaType !== 'video');

        const session = ensureSession(enriched);
        await session.startLocalMedia();
        session.setCameraEnabled(input.mediaType === 'video');

        clearRingTimer();
        ringTimerRef.current = window.setTimeout(async () => {
          try {
            await endChatCall(enriched.id, 'miss');
          } catch {
            // ignore
          }
          toast.info('No answer');
          await resetCallState();
        }, RING_TIMEOUT_MS);
      } catch (error: any) {
        const message =
          error?.message || error?.response?.data?.message || 'Failed to start call.';
        toast.error(typeof message === 'string' ? message : 'Failed to start call.');
        await resetCallState();
      }
    },
    [clearRingTimer, ensureSession, resetCallState, userId],
  );

  const acceptIncoming = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call || phaseRef.current !== 'incoming') return;

    try {
      clearRingTimer();
      setPhase('connecting');
      const updated = await acceptChatCall(call.id);
      setActiveCall((prev) => ({ ...(prev || call), ...updated, peer: prev?.peer || call.peer }));

      const session = ensureSession({ ...call, ...updated });
      await session.startLocalMedia();
      session.setCameraEnabled(call.mediaType === 'video');
      setCameraOff(call.mediaType !== 'video');
      startElapsed();
      setPhase('active');
    } catch (error: any) {
      const message =
        error?.message || error?.response?.data?.message || 'Failed to accept call.';
      toast.error(typeof message === 'string' ? message : 'Failed to accept call.');
      await resetCallState();
    }
  }, [clearRingTimer, ensureSession, resetCallState, startElapsed]);

  const rejectIncoming = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      await rejectChatCall(call.id);
    } catch {
      // ignore
    }
    await resetCallState();
  }, [resetCallState]);

  const endActiveCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) {
      await resetCallState();
      return;
    }

    try {
      const action =
        call.status === 'ringing' || phaseRef.current === 'outgoing' ? 'cancel' : 'end';
      await endChatCall(call.id, action === 'cancel' ? 'cancel' : 'end');
    } catch {
      // ignore
    }
    await resetCallState();
  }, [resetCallState]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      sessionRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    if (activeCallRef.current?.mediaType !== 'video') return;
    setCameraOff((prev) => {
      const next = !prev;
      sessionRef.current?.setCameraEnabled(!next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!userId) return undefined;

    const hasPusher = Boolean(CONFIG.pusher.key && CONFIG.pusher.cluster);
    if (!hasPusher) return undefined;

    const pusher = new Pusher(CONFIG.pusher.key, {
      cluster: CONFIG.pusher.cluster,
    });
    const channel = pusher.subscribe(userCallChannel(userId));

    const handleInvite = (payload: ChatCallSession) => {
      if (!payload?.id) return;
      if (phaseRef.current !== 'idle') {
        // Auto-decline when already in another call (not a missed call).
        rejectChatCall(payload.id).catch(() => undefined);
        return;
      }

      playChatNotificationSound();
      setActiveCall({
        ...payload,
        peer: payload.peer?.id && payload.peer.id !== userId
          ? payload.peer
          : {
              id: payload.callerId,
              name: payload.callerName || payload.peer?.name || 'Member',
              avatarUrl: payload.callerAvatarUrl || payload.peer?.avatarUrl || '',
            },
      });
      setPhase('incoming');
      setCameraOff(payload.mediaType !== 'video');

      clearRingTimer();
      ringTimerRef.current = window.setTimeout(async () => {
        try {
          await endChatCall(payload.id, 'miss');
        } catch {
          // ignore
        }
        toast.info('Missed call');
        await resetCallState();
      }, RING_TIMEOUT_MS);
    };

    const handleAccepted = async (payload: ChatCallSession) => {
      if (!payload?.id || activeCallRef.current?.id !== payload.id) return;
      clearRingTimer();
      setActiveCall((prev) =>
        prev
          ? {
              ...prev,
              ...payload,
              peer: prev.peer?.id ? prev.peer : payload.peer,
            }
          : payload,
      );
      setPhase('connecting');

      try {
        const session = ensureSession(payload);
        await session.createAndSendOffer();
        startElapsed();
        setPhase('active');
      } catch (error) {
        console.error('[ChatCall] Failed to create offer', error);
        toast.error('Failed to connect call.');
        await endActiveCall();
      }
    };

    const handleRejected = async (payload: ChatCallSession) => {
      if (!payload?.id || activeCallRef.current?.id !== payload.id) return;
      toast.info('Call declined');
      await resetCallState();
    };

    const handleEnded = async (payload: ChatCallSession) => {
      if (!payload?.id || activeCallRef.current?.id !== payload.id) return;
      toast.info('Call ended');
      await resetCallState();
    };

    const handleSignal = async (payload: ChatCallSignalPayload) => {
      if (!payload?.callId || activeCallRef.current?.id !== payload.callId) return;
      if (payload.fromUserId === userId) return;

      try {
        const call = activeCallRef.current;
        if (!call) return;
        const session = ensureSession(call);
        await session.handleSignal(payload);
      } catch (error) {
        console.error('[ChatCall] Failed to handle signal', error);
      }
    };

    channel.bind(USER_CALL_INVITE_EVENT, handleInvite);
    channel.bind(USER_CALL_ACCEPTED_EVENT, handleAccepted);
    channel.bind(USER_CALL_REJECTED_EVENT, handleRejected);
    channel.bind(USER_CALL_ENDED_EVENT, handleEnded);
    channel.bind(USER_CALL_SIGNAL_EVENT, handleSignal);

    return () => {
      channel.unbind(USER_CALL_INVITE_EVENT, handleInvite);
      channel.unbind(USER_CALL_ACCEPTED_EVENT, handleAccepted);
      channel.unbind(USER_CALL_REJECTED_EVENT, handleRejected);
      channel.unbind(USER_CALL_ENDED_EVENT, handleEnded);
      channel.unbind(USER_CALL_SIGNAL_EVENT, handleSignal);
      pusher.unsubscribe(userCallChannel(userId));
      pusher.disconnect();
    };
  }, [
    clearRingTimer,
    endActiveCall,
    ensureSession,
    resetCallState,
    startElapsed,
    userId,
  ]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(
    () => () => {
      cleanupMedia();
    },
    [cleanupMedia],
  );

  const value = useMemo<ChatCallContextValue>(
    () => ({
      phase,
      activeCall,
      muted,
      cameraOff,
      startCall,
      acceptIncoming,
      rejectIncoming,
      endActiveCall,
      toggleMute,
      toggleCamera,
    }),
    [
      acceptIncoming,
      activeCall,
      cameraOff,
      endActiveCall,
      muted,
      phase,
      rejectIncoming,
      startCall,
      toggleCamera,
      toggleMute,
    ],
  );

  const peerName = activeCall?.peer?.name || activeCall?.callerName || 'Member';
  const peerAvatar = activeCall?.peer?.avatarUrl || activeCall?.callerAvatarUrl || '';
  const isVideo = activeCall?.mediaType === 'video';
  const showIncoming = phase === 'incoming';
  const showInCall = phase === 'outgoing' || phase === 'connecting' || phase === 'active';

  return (
    <ChatCallContext.Provider value={value}>
      {children}

      {/* Remote call audio output; captions are not applicable for WebRTC streams. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      <Dialog open={showIncoming} maxWidth="xs" fullWidth>
        <DialogContent sx={{ py: 4, px: 3 }}>
          <Stack spacing={2.5} alignItems="center" textAlign="center">
            <Typography variant="overline" color="text.secondary">
              Incoming {isVideo ? 'video' : 'audio'} call
            </Typography>
            <CallAvatar name={peerName} avatarUrl={peerAvatar} />
            <Typography variant="h5">{peerName}</Typography>
            <Stack direction="row" spacing={2}>
              <Button
                color="error"
                variant="contained"
                onClick={rejectIncoming}
                startIcon={<Iconify icon="solar:phone-bold" />}
              >
                Decline
              </Button>
              <Button
                color="success"
                variant="contained"
                onClick={acceptIncoming}
                startIcon={<Iconify icon="solar:phone-bold" />}
              >
                Accept
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {showInCall ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal + 2,
            bgcolor: 'rgba(8, 10, 14, 0.94)',
            color: 'common.white',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.5, py: 2 }}
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">{peerName}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {phase === 'outgoing'
                  ? 'Calling…'
                  : phase === 'connecting'
                    ? 'Connecting…'
                    : formatElapsed(elapsedSec)}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {isVideo ? 'Video call' : 'Audio call'}
            </Typography>
          </Stack>

          <Box sx={{ flex: 1, position: 'relative', mx: 2, mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            {isVideo ? (
              <>
                <Box
                  component="video"
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  sx={{
                    width: 1,
                    height: 1,
                    objectFit: 'cover',
                    bgcolor: '#111',
                  }}
                />
                <Box
                  component="video"
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  sx={{
                    position: 'absolute',
                    right: 16,
                    bottom: 16,
                    width: { xs: 112, sm: 160 },
                    aspectRatio: '3/4',
                    objectFit: 'cover',
                    borderRadius: 1.5,
                    border: '1px solid rgba(255,255,255,0.35)',
                    bgcolor: '#000',
                    display: cameraOff ? 'none' : 'block',
                  }}
                />
                {!remoteStream ? (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={2}
                    sx={{ position: 'absolute', inset: 0 }}
                  >
                    <CallAvatar name={peerName} avatarUrl={peerAvatar} />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                      Waiting for video…
                    </Typography>
                  </Stack>
                ) : null}
              </>
            ) : (
              <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: 1 }}>
                <CallAvatar name={peerName} avatarUrl={peerAvatar} />
                <Typography variant="h6">{peerName}</Typography>
              </Stack>
            )}
          </Box>

          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="center"
            sx={{ pb: 4 }}
          >
            <IconButton
              onClick={toggleMute}
              sx={{
                width: 56,
                height: 56,
                bgcolor: muted ? 'warning.main' : 'rgba(255,255,255,0.12)',
                color: 'common.white',
                '&:hover': { bgcolor: muted ? 'warning.dark' : 'rgba(255,255,255,0.2)' },
              }}
            >
              <Iconify
                icon={muted ? 'solar:microphone-mute-bold' : 'solar:microphone-bold'}
                width={24}
              />
            </IconButton>

            {isVideo ? (
              <IconButton
                onClick={toggleCamera}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: cameraOff ? 'warning.main' : 'rgba(255,255,255,0.12)',
                  color: 'common.white',
                  '&:hover': {
                    bgcolor: cameraOff ? 'warning.dark' : 'rgba(255,255,255,0.2)',
                  },
                }}
              >
                <Iconify
                  icon={
                    cameraOff
                      ? 'solar:videocamera-slash-bold'
                      : 'solar:videocamera-record-bold'
                  }
                  width={24}
                />
              </IconButton>
            ) : null}

            <IconButton
              onClick={endActiveCall}
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'error.main',
                color: 'common.white',
                '&:hover': { bgcolor: 'error.dark' },
              }}
            >
              <Iconify icon="solar:phone-bold" width={28} />
            </IconButton>
          </Stack>
        </Box>
      ) : null}
    </ChatCallContext.Provider>
  );
}
