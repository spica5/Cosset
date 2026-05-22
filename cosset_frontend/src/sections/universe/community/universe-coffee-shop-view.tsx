'use client';

import type { CoffeeShopChatParticipant } from 'src/types/coffee-shop-chat';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/universe/iconify';

import { mutate } from 'swr';

import { leaveCoffeeShopPresence, useGetCoffeeShop } from 'src/actions/coffee-shop';
import { endpoints } from 'src/utils/axios';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { UniverseCoffeeShopChat } from 'src/sections/universe/community/universe-coffee-shop-chat';
import { UniverseCoffeeShopMenu } from 'src/sections/universe/community/universe-coffee-shop-menu';
import { UniverseCoffeeShopMusicPlayer } from 'src/sections/universe/community/universe-coffee-shop-music-player';
import { CoffeeShopAtmosphereLayers } from 'src/sections/universe/community/coffee-shop-atmosphere-layers';
import { UniverseCoffeeShopParticipants } from 'src/sections/universe/community/universe-coffee-shop-participants';
import {
  isCoffeeShopGradientBackground,
  parseCoffeeShopBackgroundImages,
} from 'src/utils/coffee-shop-background';
import {
  COFFEE_SHOP_EVENING_BACKGROUND_FILTER,
  COFFEE_SHOP_EVENING_GRADIENT_BACKGROUND_FILTER,
  hasEveningAtmosphere,
  parseCoffeeShopAtmosphere,
} from 'src/utils/coffee-shop-atmosphere';
import { getS3SignedUrl } from 'src/utils/helper';

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

  const handleLeaveCoffeeShop = useCallback(async () => {
    if (authenticated && user?.id) {
      const uid = String(user.id);
      setParticipants((prev) => removeParticipant(prev, uid));
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
  }, []);

  const handleParticipantLeave = useCallback((userId: string) => {
    setParticipants((prev) => removeParticipant(prev, userId));
  }, []);

  useEffect(() => {
    setParticipants([]);
  }, [coffeeShopId]);

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

  const atmosphere = useMemo(
    () => parseCoffeeShopAtmosphere(coffeeShop?.atmosphere),
    [coffeeShop?.atmosphere],
  );
  const eveningTone = hasEveningAtmosphere(atmosphere);

  const musicPlayer = (
    <UniverseCoffeeShopMusicPlayer coffeeShopId={coffeeShopId} musicJson={coffeeShop?.music} />
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
    <>
    
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
            ...(eveningTone ? { filter: COFFEE_SHOP_EVENING_GRADIENT_BACKGROUND_FILTER } : {}),
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
            ...(eveningTone ? { filter: COFFEE_SHOP_EVENING_BACKGROUND_FILTER } : {}),
          }}
        />
      ) : null}

      <CoffeeShopAtmosphereLayers
        atmosphere={atmosphere}
        seed={coffeeShopId}
        layout="fullscreen"
      />

      <Stack
        sx={{
          position: 'fixed',
          top: { xs: 12, sm: 16 },
          right: { xs: 12, sm: 24 },
          zIndex: 10,
          alignItems: 'flex-start',
          gap: 1.25,
          maxHeight: 'calc(100dvh - 24px)',
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
            '&:hover': { bgcolor: 'rgba(0,0,0,0.62)' },
          }}
        >
          Out
        </Button>
      </Stack>
      {musicPlayer}
      <Stack
        sx={{
          position: 'fixed',
          top: { xs: 82, sm: 100 },
          left: { xs: 12, sm: 24 },
          zIndex: 10,
          alignItems: 'flex-start',
          gap: 1.25,
          maxHeight: 'calc(100dvh - 24px)',
          pointerEvents: 'auto',
        }}
      >
        {!isGradient && resolvedImageUrls.length > 1 && (
          <Stack
            spacing={1}
            sx={{
              py: 1,
              px: 1,
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              height: '40vh',
              maxHeight: '40vh',
              overflowY: 'auto',
            }}
          >
            {resolvedImageUrls.map((url, index) => (
              <Box
                key={`${index}-${url.slice(0, 40)}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBackgroundIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedBackgroundIndex(index);
                  }
                }}
                sx={{
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  borderRadius: 1,
                  cursor: 'pointer',
                  backgroundImage: `url(${url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border:
                    index === selectedBackgroundIndex
                      ? '2px solid rgba(255,255,255,0.95)'
                      : '1px solid rgba(255,255,255,0.25)',
                  boxShadow:
                    index === selectedBackgroundIndex ? '0 0 0 2px rgba(0,0,0,0.35)' : undefined,
                  opacity: index === selectedBackgroundIndex ? 1 : 0.85,
                  '&:hover': { opacity: 1 },
                }}
              />
            ))}
          </Stack>
        )}
      </Stack>

      <Stack sx={{ position: 'relative', zIndex: 1, p: 4, pl: { xs: 10, sm: 14 } , display: 'flex',
                    alignItems: 'center', justifyContent: 'center',}}>
        <Typography
          variant="subtitle2"
          sx={{ color: 'common.white', textShadow: '0 2px 8px rgba(0,0,0,0.45)',textAlign: 'center', fontSize: '18px'}}
        >
          {coffeeShop.title || coffeeShop.name}
        </Typography>
      </Stack>

      <UniverseCoffeeShopParticipants participants={participants} />

      <UniverseCoffeeShopMenu coffeeShopId={coffeeShopId} />

      <UniverseCoffeeShopChat
        coffeeShopId={coffeeShopId}
        onParticipantsLoaded={handleParticipantsLoaded}
        onParticipantJoin={handleParticipantJoin}
        onParticipantLeave={handleParticipantLeave}
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
              }}
            />
          ) : null}
        </Box>
      </Dialog>
    </Box>
    </>
  );
}
