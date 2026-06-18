'use client';

import type { CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';

import { mutate } from 'swr';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { endpoints } from 'src/utils/axios';
import { getS3SignedUrl } from 'src/utils/helper';

import {
  getAtmosphereBackgroundFilter,
  parseCoffeeShopAtmosphereConfig,
  getAtmosphereForBackgroundImage,
  getAtmosphereForBackgroundIndex,
} from 'src/utils/coffee-shop-atmosphere';

import {
  isCoffeeShopGradientBackground,
  parseCoffeeShopBackgroundImages,
} from 'src/utils/coffee-shop-background';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {  
  COFFEE_SHOP_IDLE_MS,
  COFFEE_SHOP_ACTIVITY_EVENT,  
  useGetCoffeeShop,
  joinCoffeeShopPresence,
  pingCoffeeShopPresence,
  leaveCoffeeShopPresence,  
  setCoffeeShopPresenceHidden,
  coffeeShopActivityStorageKey,
} from 'src/actions/coffee-shop';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { Iconify } from 'src/components/universe/iconify';

import { UniverseCoffeeShopChat } from 'src/sections/universe/community/universe-coffee-shop-chat';
import { UniverseCoffeeShopMenu } from 'src/sections/universe/community/universe-coffee-shop-menu';
import { CoffeeShopAtmosphereLayers } from 'src/sections/universe/community/coffee-shop-atmosphere-layers';
import { UniverseCoffeeShopMobileDock } from 'src/sections/universe/community/universe-coffee-shop-mobile-dock';
import { UniverseCoffeeShopMusicPlayer } from 'src/sections/universe/community/universe-coffee-shop-music-player';
import { UniverseCoffeeShopParticipants } from 'src/sections/universe/community/universe-coffee-shop-participants';
import { UniverseCoffeeShopBackgroundPicker } from 'src/sections/universe/community/universe-coffee-shop-background-picker';

// ----------------------------------------------------------------------

function mergeParticipant(
  list: CoffeeShopChatParticipant[],
  next: CoffeeShopChatParticipant,
): CoffeeShopChatParticipant[] {
  const key = next.userId.trim().toLowerCase();
  const index = list.findIndex((p) => p.userId.trim().toLowerCase() === key);
  if (index < 0) {
    return [...list, next];
  }

  const existing = list[index];
  const photoURL = next.photoURL || existing.photoURL;
  const updated = { ...existing, ...next, photoURL };
  // Clear offline marker unless the update explicitly sets leftAt
  if (!next.leftAt) {
    delete (updated as CoffeeShopChatParticipant & { leftAt?: string }).leftAt;
  }
  return list.map((p, i) => (i === index ? updated : p));
}

function removeParticipant(
  list: CoffeeShopChatParticipant[],
  userId: string,
): CoffeeShopChatParticipant[] {
  const key = userId.trim().toLowerCase();
  return list.filter((p) => p.userId.trim().toLowerCase() !== key);
}

type Props = {
  coffeeShopId: string;
};

export function UniverseCoffeeShopView({ coffeeShopId }: Props) {
  const router = useRouter();
  const { coffeeShop, coffeeShopLoading } = useGetCoffeeShop(coffeeShopId);
  const { authenticated, user } = useAuthContext();
  const [participants, setParticipants] = useState<CoffeeShopChatParticipant[]>([]);
  const [presenceJoining, setPresenceJoining] = useState(false);
  const [togglingHidden, setTogglingHidden] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [selectedPrivateReceiverId, setSelectedPrivateReceiverId] = useState<string | null>(null);

  const [systemNotifications, setSystemNotifications] = useState<
    { id: string; text: string; avatar?: string | null }[]
  >([]);

  const recentNotifRef = useRef<Record<string, number>>({});

  const pushSystemNotification = useCallback((text: string, avatar?: string | null, userId?: string) => {
    try {
      const now = Date.now();

      // normalize action for dedupe
      const action = /entered/i.test(text) ? 'enter' : /left/i.test(text) ? 'leave' : 'note';
      const key = `${userId || ''}:${action}`;

      // dedupe within 5s
      const prev = recentNotifRef.current[key];
      if (prev && now - prev < 5000) {
        return;
      }
      recentNotifRef.current[key] = now;

      // sanitize text: avoid showing raw UUIDs or numeric ids
      const display = text;
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const numericIdLike = /^[0-9]{6,}$/;

      if (userId) {
        const maybeId = String(userId).trim();
        if (uuidLike.test(maybeId) || numericIdLike.test(maybeId)) {
          if (display === maybeId || display.startsWith(`${maybeId} `) || display.endsWith(` ${maybeId}`)) {
            return;
          }
        }
      } else if (uuidLike.test(display) || numericIdLike.test(display)) {
        return;
      }

      const id = `sys:${String(now)}:${Math.random().toString(36).slice(2, 8)}`;
      setSystemNotifications((s) => [...s, { id, text: display, avatar }]);
      window.setTimeout(() => setSystemNotifications((s) => s.filter((n) => n.id !== id)), 5000);
    } catch {
      // ignore
    }
  }, []);

  const isPresent = useMemo(() => {
    try {
      const uid = user?.id != null ? String(user.id).trim().toLowerCase() : '';
      if (!uid) return false;
      return participants.some(
        (p) => String(p.userId || '').trim().toLowerCase() === uid && !p.leftAt,
      );
    } catch {
      return false;
    }
  }, [participants, user?.id]);

  const handleLeaveCoffeeShop = useCallback(async () => {
    if (authenticated && user?.id) {
      const uid = String(user.id);
      setParticipants((prev) => removeParticipant(prev, uid));
      try {
        window.localStorage.removeItem(coffeeShopActivityStorageKey(coffeeShopId));
      } catch {
        // ignore
      }
      try {
        await leaveCoffeeShopPresence(coffeeShopId);
      } catch {
        // still navigate away
      }
    }
    router.push(paths.dashboard.community.coffeeShop.list);
  }, [authenticated, coffeeShopId, router, user?.id]);

  const handleParticipantsLoaded = useCallback((loaded: CoffeeShopChatParticipant[]) => {
    setParticipants((prev) => {
      let next = [...loaded];
      prev.forEach((p) => {
        next = mergeParticipant(next, p);
      });
      return next;
    });
  }, []);

  const handleParticipantJoin = useCallback((participant: CoffeeShopChatParticipant) => {
    setParticipants((prev) => mergeParticipant(prev, participant));
    try {
      const key = participant.userId.trim().toLowerCase();
      const t = leaveTimeoutsRef.current?.[key];
      if (t) {
        clearTimeout(t);
        delete leaveTimeoutsRef.current[key];
      }
    } catch {
      // ignore
    }
  }, []);

  const leaveTimeoutsRef = useRef<Record<string, number>>({});

  const handleParticipantLeave = useCallback((userId: string) => {
    const key = String(userId).trim().toLowerCase();
    const leaveAt = new Date().toISOString().replace('T', ' ').replace('Z', '');
    setParticipants((prev) => {
      // mark leftAt on existing participant or add a placeholder
      const idx = prev.findIndex((p) => p.userId.trim().toLowerCase() === key);
      if (idx < 0) {
        return [...prev, { userId: String(userId), name: 'Unknown', photoURL: null, leftAt: leaveAt }];
      }
      return prev.map((p) =>
        p.userId.trim().toLowerCase() === key ? { ...p, leftAt: leaveAt } : p,
      );
    });

    // schedule removal after 30 minutes
    try {
      const existing = leaveTimeoutsRef.current[key];
      if (existing) {
        clearTimeout(existing);
      }
    } catch {
      // ignore
    }

    const timeoutId = window.setTimeout(() => {
      setParticipants((prev) => prev.filter((p) => p.userId.trim().toLowerCase() !== key));
      try {
        delete leaveTimeoutsRef.current[key];
      } catch {
        // ignore
      }
    }, 30 * 60 * 1000);

    try {
      leaveTimeoutsRef.current[key] = timeoutId as unknown as number;
    } catch {
      // ignore
    }
  }, []);

  const handleSelectPrivateReceiver = useCallback((participant: CoffeeShopChatParticipant) => {
    const receiverId = participant.userId?.trim();
    if (receiverId) {
      setSelectedPrivateReceiverId(receiverId);
    }
  }, []);

  const handleToggleHidden = async () => {
      if (togglingHidden || !authenticated) {
        return;
      }  
      setTogglingHidden(true);
      try {
        const newHiddenState = !isHidden;
        const res = await setCoffeeShopPresenceHidden(coffeeShopId, newHiddenState);
        if (typeof res.isHidden === 'boolean') {
          setIsHidden(res.isHidden);
        }
      } catch (err) {
        // Revert on error
        console.error('Failed to toggle hidden status', err);
      } finally {
        setTogglingHidden(false);
      }
    };
  

  useEffect(() => {
    setParticipants([]);
    setSelectedPrivateReceiverId(null);
  }, [coffeeShopId]);

  useEffect(() => {
    if (!selectedPrivateReceiverId) {
      return;
    }

    const receiverKey = selectedPrivateReceiverId.trim().toLowerCase();
    const stillPresent = participants.some(
      (p) => p.userId.trim().toLowerCase() === receiverKey && !p.leftAt,
    );

    if (!stillPresent) {
      setSelectedPrivateReceiverId(null);
    }
  }, [participants, selectedPrivateReceiverId]);

  const isPresentRef = useRef(isPresent);
  isPresentRef.current = isPresent;

  const handleParticipantJoinRef = useRef(handleParticipantJoin);
  handleParticipantJoinRef.current = handleParticipantJoin;

  const handleParticipantLeaveRef = useRef(handleParticipantLeave);
  handleParticipantLeaveRef.current = handleParticipantLeave;

  useEffect(() => {
    if (!coffeeShopId || !user?.id || !authenticated) {
      return undefined;
    }

    const uid = String(user.id);
    const activityKey = coffeeShopActivityStorageKey(coffeeShopId);
    const ACTIVITY_STORAGE_THROTTLE_MS = 10 * 1000;
    const PRESENCE_PING_THROTTLE_MS = 5 * 60 * 1000;

    let idleTimer: number | undefined;
    let lastStorageWrite = 0;
    let lastPingAt = 0;
    let lastRejoinAttempt = 0;
    let markingOffline = false;

    const getLastActivity = (): number => {
      try {
        const raw = window.localStorage.getItem(activityKey);
        const ts = raw ? Number.parseInt(raw, 10) : Number.NaN;
        return Number.isNaN(ts) ? Date.now() : ts;
      } catch {
        return Date.now();
      }
    };

    const setLastActivity = (ts: number) => {
      try {
        window.localStorage.setItem(activityKey, String(ts));
      } catch {
        // ignore
      }
    };

    const markOfflineForInactivity = async () => {
      if (markingOffline || !isPresentRef.current) {
        return;
      }

      markingOffline = true;

      try {
        await leaveCoffeeShopPresence(coffeeShopId);
      } catch {
        // ignore
      }

      try {
        window.localStorage.removeItem(activityKey);
      } catch {
        // ignore
      }

      handleParticipantLeaveRef.current(uid);
      markingOffline = false;
    };

    const scheduleIdleTimeout = () => {
      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }

      const lastActivity = getLastActivity();
      const remaining = COFFEE_SHOP_IDLE_MS - (Date.now() - lastActivity);

      if (remaining <= 0) {
        markOfflineForInactivity();
        return;
      }

      idleTimer = window.setTimeout(() => {
        if (Date.now() - getLastActivity() >= COFFEE_SHOP_IDLE_MS) {
          markOfflineForInactivity();
        } else {
          scheduleIdleTimeout();
        }
      }, remaining);
    };

    const rejoinAfterIdle = async () => {
      try {
        const { participant } = await joinCoffeeShopPresence(coffeeShopId);
        if (participant) {
          handleParticipantJoinRef.current(participant);
        }
      } catch {
        // ignore
      }
    };

    const onActivity = () => {
      const now = Date.now();

      if (!isPresentRef.current) {
        if (now - lastRejoinAttempt >= ACTIVITY_STORAGE_THROTTLE_MS) {
          lastRejoinAttempt = now;
          rejoinAfterIdle();
        }
        setLastActivity(now);
        lastStorageWrite = now;
        scheduleIdleTimeout();
        return;
      }

      if (now - lastStorageWrite >= ACTIVITY_STORAGE_THROTTLE_MS) {
        lastStorageWrite = now;
        setLastActivity(now);
      }

      if (now - lastPingAt >= PRESENCE_PING_THROTTLE_MS) {
        lastPingAt = now;
        pingCoffeeShopPresence(coffeeShopId).catch(() => undefined);
      }

      scheduleIdleTimeout();
    };

    try {
      if (!window.localStorage.getItem(activityKey)) {
        setLastActivity(Date.now());
      }
    } catch {
      // ignore
    }

    scheduleIdleTimeout();

    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener(COFFEE_SHOP_ACTIVITY_EVENT, onActivity);

    return () => {
      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener(COFFEE_SHOP_ACTIVITY_EVENT, onActivity);
    };
  }, [authenticated, coffeeShopId, user?.id]);

  useEffect(() => {
    if (!coffeeShopId) {
      return;
    }
    mutate(endpoints.coffeeShop.details(coffeeShopId));
  }, [coffeeShopId]);

  const rawBackground = String(coffeeShop?.background || '').trim();
  const isGradient = useMemo(() => isCoffeeShopGradientBackground(rawBackground), [rawBackground]);
  const backgroundImageKeys = useMemo(
    () => parseCoffeeShopBackgroundImages(rawBackground),
    [rawBackground],
  );

  const [resolvedImageUrls, setResolvedImageUrls] = useState<string[]>([]);
  const [selectedBackgroundIndex, setSelectedBackgroundIndex] = useState(0);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  useEffect(() => {
    setSelectedBackgroundIndex(0);
  }, [rawBackground, coffeeShop?.id]);

  useEffect(() => {
    let mounted = true;

    const resolveImages = async () => {
      if (!backgroundImageKeys.length) {
        if (mounted) {
          setResolvedImageUrls([]);
        }
        return;
      }

      const urls = await Promise.all(
        backgroundImageKeys.map(async (key) => {
          if (key.startsWith('http://') || key.startsWith('https://')) {
            return key;
          }
          return (await getS3SignedUrl(key)) || '';
        }),
      );

      if (mounted) {
        setResolvedImageUrls(urls.filter(Boolean));
      }
    };

    resolveImages();

    return () => {
      mounted = false;
    };
  }, [backgroundImageKeys]);

  useEffect(() => {
    setSelectedBackgroundIndex((i) => {
      if (!resolvedImageUrls.length) {
        return 0;
      }
      return Math.min(i, resolvedImageUrls.length - 1);
    });
  }, [resolvedImageUrls.length]);

  const activeImageUrl =
    !isGradient && resolvedImageUrls.length
      ? resolvedImageUrls[Math.min(selectedBackgroundIndex, resolvedImageUrls.length - 1)] || ''
      : '';

  const hasImage =
    Boolean(activeImageUrl) &&
    (activeImageUrl.startsWith('http://') || activeImageUrl.startsWith('https://'));

  const atmosphereConfig = useMemo(
    () => parseCoffeeShopAtmosphereConfig(coffeeShop?.atmosphere),
    [coffeeShop?.atmosphere],
  );

  const activeAtmosphere = useMemo(() => {
    if (isGradient) {
      return atmosphereConfig.default;
    }

    return getAtmosphereForBackgroundIndex(
      atmosphereConfig,
      backgroundImageKeys,
      selectedBackgroundIndex,
    );
  }, [atmosphereConfig, backgroundImageKeys, selectedBackgroundIndex, isGradient]);

  const backgroundImageFilters = useMemo(
    () =>
      backgroundImageKeys.map((key) =>
        getAtmosphereBackgroundFilter(getAtmosphereForBackgroundImage(atmosphereConfig, key), false),
      ),
    [atmosphereConfig, backgroundImageKeys],
  );

  const hasBackgroundPicker = !isGradient && resolvedImageUrls.length > 1;

  const musicPlayer = (
    <UniverseCoffeeShopMusicPlayer
      coffeeShopId={coffeeShopId}
      musicJson={coffeeShop?.music}
      isPresent={isPresent}
    />
  );

  if (coffeeShopLoading) {
    return (
      <>
        {musicPlayer}
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#0b0f14' }}>
          <CircularProgress sx={{ color: 'common.white' }} />
        </Box>
      </>
    );
  }

  if (!coffeeShop) {
    return (
      <Box
        sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#0b0f14', p: 3 }}
      >
        <Typography variant="h6" sx={{ color: 'common.white' }}>
          Coffee shop not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        height: '100dvh',
        width: '100%',
        bgcolor: '#0b0f14',
        overflow: 'hidden',
      }}
    >
      {isGradient ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            background: rawBackground,
            filter: getAtmosphereBackgroundFilter(activeAtmosphere, true),
          }}
        />
      ) : null}

      {hasImage ? (
        <Box
          component="img"
          src={activeImageUrl}
          alt={coffeeShop.title || coffeeShop.name}
          onClick={() => setImagePreviewOpen(true)}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            bgcolor: '#0b0f14',
            cursor: 'zoom-in',
            display: 'block',
            filter: getAtmosphereBackgroundFilter(activeAtmosphere, false),
          }}
        />
      ) : null}

      <CoffeeShopAtmosphereLayers
        atmosphere={activeAtmosphere}
        seed={coffeeShopId}
        layout="fullscreen"
      />

      <Stack
        sx={{
          position: 'fixed',
          top: { xs: 8, sm: 16 },
          right: { xs: 8, sm: 24 },
          zIndex: 10,
          alignItems: 'flex-end',
          gap: 0.75,
          maxHeight: 'calc(100dvh - 16px)',
          pointerEvents: 'auto',
        }}
      >
        <Button
          type="button"
          onClick={handleLeaveCoffeeShop}
          startIcon={<Iconify icon="solar:logout-2-outline" width={20} />}
          sx={{
            color: 'common.white',
            bgcolor: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            textTransform: 'none',
            fontWeight: 600,
            flexShrink: 0,
            minWidth: { xs: 64, sm: 80 },
            px: { xs: 1, sm: 1.5 },
            fontSize: { xs: 12, sm: 14 },
            '&:hover': { bgcolor: 'rgba(0,0,0,0.62)' },
          }}
          disabled={!isPresent}
        >
          Out
        </Button>

        {authenticated && (
            <Button
              type="button"
              onClick={handleToggleHidden}
              disabled={togglingHidden}
              startIcon ={<Iconify icon={isHidden ? 'eva:eye-off-fill' : 'eva:eye-fill'} width={20} />}
              sx={{
                color: isHidden ? 'warning.main' : 'common.white',
                bgcolor: 'rgba(0,0,0,0.45)',
                border: isHidden ? '1px solid' : '1px solid transparent',
                borderColor: isHidden ? 'warning.main' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.3s',
                minWidth: { xs: 64, sm: 80 },
                px: { xs: 1, sm: 1.5 },
                fontSize: { xs: 12, sm: 14 },
                '&:hover': { color: 'warning.main', borderColor: 'warning.main' },
              }}
              title={isHidden ? 'You are hidden - Click to show' : 'Hide yourself from the list'}
            >
              Hide
            </Button>
          )}
      </Stack>

      {musicPlayer}

      <Stack
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 2, sm: 4 },
          py: { xs: 1.5, sm: 4 },
          pt: { xs: 7, sm: 4 },
          pl: { xs: 2, sm: 14 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: 'common.white',
            textShadow: '0 2px 8px rgba(0,0,0,0.45)',
            textAlign: 'center',
            fontSize: { xs: 16, sm: 18 },
            px: { xs: 6, sm: 0 },
          }}
        >
          {coffeeShop.title || coffeeShop.name}
        </Typography>
      </Stack>

      {hasBackgroundPicker ? (
        <UniverseCoffeeShopBackgroundPicker
          imageUrls={resolvedImageUrls}
          imageFilters={backgroundImageFilters}
          selectedIndex={selectedBackgroundIndex}
          onSelect={setSelectedBackgroundIndex}
        />
      ) : null}

      <UniverseCoffeeShopParticipants
        participants={participants}
        selectedPrivateReceiverId={selectedPrivateReceiverId}
        onSelectPrivateReceiver={handleSelectPrivateReceiver}
        stackAboveBackground={hasBackgroundPicker}
      />

      <UniverseCoffeeShopMobileDock />

      <UniverseCoffeeShopMenu coffeeShopId={coffeeShopId} isPresent={isPresent} />

      {/* ephemeral system notifications (enter/leave) */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 30,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none',
          px: 2,
        }}
      >
        <Stack spacing={1} sx={{ width: '100%', maxWidth: 520 }}>
          {systemNotifications.map((n) => (
            <Paper
              key={n.id}
              elevation={10}
              sx={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                bgcolor: 'rgba(10,13,16,0.95)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {n.avatar ? (
                <Avatar src={n.avatar} sx={{ width: 36, height: 36, flexShrink: 0 }} />
              ) : (
                <Avatar sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: 'rgba(255,255,255,0.08)', color: 'common.white' }}>
                  {n.text?.[0] ?? '?'}
                </Avatar>
              )}
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)' }}>
                {n.text}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      {presenceJoining ? (
        <Stack
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'auto',
            p: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle1" sx={{ color: 'common.white', mb: 0.5 }}>
              Entering {coffeeShop.title} coffee shop 
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              Please wait...
            </Typography>
          </Box>
        </Stack>
      ) : null}

      {!presenceJoining && !isPresent && (
        <Stack
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'auto',
            p: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle1" sx={{ color: 'common.white', mb: 0.5 }}>
              You are out of this coffee shop
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              Actions are disabled until you re-enter the coffee shop.
            </Typography>
          </Box>
        </Stack>
      )}

      <UniverseCoffeeShopChat
        coffeeShopId={coffeeShopId}
        participants={participants}
        onParticipantsLoaded={handleParticipantsLoaded}
        onParticipantJoin={handleParticipantJoin}
        onParticipantLeave={handleParticipantLeave}
        onPresenceLoadingChange={setPresenceJoining}
        isPresent={isPresent}
        isHidden={isHidden}
        selectedPrivateReceiverId={selectedPrivateReceiverId}
        onSelectPrivateReceiver={handleSelectPrivateReceiver}
        onSystemNotification={pushSystemNotification}
      />

      <Dialog fullScreen open={imagePreviewOpen} onClose={() => setImagePreviewOpen(false)}>
        <Box
          sx={{
            position: 'relative',
            width: '100vw',
            height: '100dvh',
            bgcolor: '#0b0f14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconButton
            onClick={() => setImagePreviewOpen(false)}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 2,
              color: 'common.white',
              bgcolor: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.62)' },
            }}
          >
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>

          {hasImage ? (
            <Box
              component="img"
              src={activeImageUrl}
              alt={coffeeShop.title || coffeeShop.name}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block',
                filter: getAtmosphereBackgroundFilter(activeAtmosphere, false),
              }}
            />
          ) : null}
        </Box>
      </Dialog>
    </Box>
  );
}
