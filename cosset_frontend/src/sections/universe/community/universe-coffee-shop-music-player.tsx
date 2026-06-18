'use client';

import type { CoffeeShopMusicTrack } from 'src/utils/coffee-shop-music';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { touchCoffeeShopActivity } from 'src/actions/coffee-shop';

import { getS3SignedUrl } from 'src/utils/helper';
import { fetcher, endpoints } from 'src/utils/axios';
import { getCoffeeShopMusicTracks } from 'src/utils/coffee-shop-music';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = {
  coffeeShopId: string;
  musicJson?: unknown;
  isPresent?: boolean;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function UniverseCoffeeShopMusicPlayer({ coffeeShopId, musicJson, isPresent = true }: Props) {
  const theme = useTheme();
  const detailUrl = coffeeShopId ? endpoints.coffeeShop.details(coffeeShopId) : null;

  const { data: shopData } = useSWR(detailUrl, fetcher, {
    revalidateOnMount: true,
    revalidateIfStale: true,
  });

  const resolvedMusicJson = shopData?.coffeeShop?.music ?? musicJson;

  const sourceTracks = useMemo(
    () => getCoffeeShopMusicTracks(resolvedMusicJson),
    [resolvedMusicJson],
  );

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [tracks, setTracks] = useState<CoffeeShopMusicTrack[]>([]);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIndexRef = useRef(0);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const lastMusicActivityAtRef = useRef(0);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!isPresent) {
      stopPlayback();
    }
  }, [isPresent, stopPlayback]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  useEffect(() => {
    if (!isPlaying || !isPresent) {
      return undefined;
    }

    touchCoffeeShopActivity(coffeeShopId);
    lastMusicActivityAtRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      touchCoffeeShopActivity(coffeeShopId);
      lastMusicActivityAtRef.current = Date.now();
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [coffeeShopId, isPlaying, isPresent]);

  useEffect(() => {
    if (!sourceTracks.length) {
      setTracks([]);
      setResolving(false);
      setResolveError(false);
      setCurrentIndex(0);
      setIsPlaying(false);
      return;
    }

    setTracks(sourceTracks);
    setResolving(false);
    setResolveError(false);
    setCurrentIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [sourceTracks]);

  const currentTrack = tracks[currentIndex] || sourceTracks[currentIndex] || null;

  const loadAndPlay = useCallback(
    async (index: number, autoplay = true) => {
      const track = tracks[index];
      if (!track?.audioUrl) {
        return;
      }

      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      setLoading(true);
      setCurrentIndex(index);

      try {
        // Get fresh signed URL for each playback
        let urlToUse = track.audioUrl.trim();
        if (!urlToUse.startsWith('http://') && !urlToUse.startsWith('https://')) {
          const freshUrl = await getS3SignedUrl(urlToUse);
          if (!freshUrl) {
            setLoading(false);
            return;
          }
          urlToUse = freshUrl;
        }

        audio.src = urlToUse;
        audio.load();

        if (!autoplay) {
          setLoading(false);
          setIsPlaying(false);
          return;
        }

        try {
          await audio.play();
          setIsPlaying(true);
          touchCoffeeShopActivity(coffeeShopId);
        } catch {
          setIsPlaying(false);
        }
      } catch {
        setIsPlaying(false);
      } finally {
        setLoading(false);
      }
    },
    [coffeeShopId, tracks],
  );



  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !tracks.length) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (!audio.src || !audio.currentSrc) {
      await loadAndPlay(currentIndex, true);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
      touchCoffeeShopActivity(coffeeShopId);
    } catch {
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (!tracks.length) {
      return;
    }
    const nextIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    loadAndPlay(nextIndex, isPlaying);
  };

  const handleNext = () => {
    if (!tracks.length) {
      return;
    }
    const nextIndex = (currentIndex + 1) % tracks.length;
    loadAndPlay(nextIndex, isPlaying);
  };

  const handleTrackChange = (index: number) => {
    loadAndPlay(index, isPlaying);
  };

  const seekTo = useCallback((position: number) => {
    const audio = audioRef.current;
    if (!audio || !duration || duration <= 0) {
      return;
    }
    const newTime = Math.max(0, Math.min(position, duration));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) {
      return;
    }
    const rect = progressRef.current.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    const newTime = clickPos * duration;
    seekTo(newTime);
  }, [duration, seekTo]);

  const handleProgressMouseDown = () => {
    isDraggingRef.current = true;
  };

  useEffect(() => {
    // if (!isDraggingRef.current) {
    //   return;
    // }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !progressRef.current || !duration) {
        return;
      }
      const rect = progressRef.current.getBoundingClientRect();
      const movePos = (e.clientX - rect.left) / rect.width;
      const newTime = movePos * duration;
      seekTo(newTime);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [duration, seekTo]);

  if (!portalTarget) {
    return null;
  }

  const hasTracks = sourceTracks.length > 0;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const displayTitle =
    (currentTrack && 'title' in currentTrack ? currentTrack.title : null) || 'Music';
  const controlsDisabled = !hasTracks || resolving || resolveError || !tracks.length || !isPresent;

  const statusText = !hasTracks
    ? 'No music'
    : resolveError
      ? 'Could not load audio'
      : resolving
        ? 'Loading…'
        : `${formatTime(currentTime)} / ${formatTime(duration)}`;

  const panel = (
    <Box
      sx={{
        position: 'fixed',
        top: { xs: 8, sm: 16 },
        left: { xs: 100, sm: 'auto' },
        right: { xs: 80, sm: 120 },
        zIndex: theme.zIndex.snackbar,
        pointerEvents: 'auto',
        width: { xs: 'auto', sm: 300 },
        maxWidth: { xs: 'calc(100vw - 96px)', sm: 300 },
      }}
    >
      <Stack
        spacing={0.75}
        sx={{
          py: 1,
          px: 1.25,
          borderRadius: 2,
          bgcolor: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}
      >
        <Collapse in={expanded && tracks.length > 1}>
          <Stack
            spacing={0.25}
            sx={{
              mb: 0.5,
              maxHeight: 160,
              overflowY: 'auto',
              borderRadius: 1,
              border: '1px solid rgba(255,255,255,0.12)',
              bgcolor: 'rgba(0,0,0,0.35)',
              py: 0.5,
              '&::-webkit-scrollbar': { 
                width: 6 
              },
              '&::-webkit-scrollbar-track': {
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.05)',
              },
              '&::-webkit-scrollbar-thumb': {
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.35)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.5)',
                },
              },
            }}
          >
            {tracks.map((track, index) => {
              const isActive = index === currentIndex;
              return (
                <Box
                  key={track.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTrackChange(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTrackChange(index);
                    }
                  }}
                  sx={{
                    px: 1,
                    py: 0.75,
                    mx: 0.5,
                    borderRadius: 0.75,
                    cursor: controlsDisabled ? 'default' : 'pointer',
                    bgcolor: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                    opacity: controlsDisabled ? 0.5 : 1,
                    '&:hover': {
                      bgcolor: controlsDisabled ? undefined : 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: 'common.white', fontWeight: isActive ? 600 : 400 }}
                  >
                    {track.title}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Collapse>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          {resolving && hasTracks ? (
            <CircularProgress size={28} sx={{ color: 'common.white', mx: 0.5 }} />
          ) : (
            <IconButton
              size="small"
              onClick={() => handleTogglePlay()}
              disabled={loading || controlsDisabled}
              sx={{ color: 'common.white' }}
              aria-label={isPlaying ? 'Pause music' : 'Play music'}
            >
              <Iconify
                icon={isPlaying ? 'solar:pause-circle-bold' : 'solar:play-circle-bold'}
                width={28}
              />
            </IconButton>
          )}

          <IconButton
            size="small"
            onClick={handlePrev}
            disabled={controlsDisabled}
            sx={{ color: 'common.white' }}
            aria-label="Previous track"
          >
            <Iconify icon="solar:skip-previous-bold" width={20} />
          </IconButton>

          <IconButton
            size="small"
            onClick={handleNext}
            disabled={controlsDisabled}
            sx={{ color: 'common.white' }}
            aria-label="Next track"
          >
            <Iconify icon="solar:skip-next-bold" width={20} />
          </IconButton>

          <Box sx={{ flex: 1, minWidth: 0, px: 0.5 }}>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: 'common.white', fontWeight: 600, display: 'block' }}
            >
              {hasTracks ? displayTitle : 'Background music'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }} noWrap>
              {statusText}
            </Typography>
          </Box>

          {tracks.length > 1 ? (
            <IconButton
              size="small"
              onClick={() => setExpanded((v) => !v)}
              sx={{ color: 'common.white' }}
              aria-label={expanded ? 'Collapse playlist' : 'Expand playlist'}
            >
              <Iconify
                icon={expanded ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
                width={20}
              />
            </IconButton>
          ) : null}
        </Stack>

        {hasTracks && !resolveError && !resolving ? (
          <Box
            ref={progressRef}
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            sx={{
              height: 3,
              borderRadius: 1,
              bgcolor: 'rgba(255,255,255,0.15)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                height: 6,
              },
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${progress}%`,
                bgcolor: 'info.main',
                transition: isDraggingRef.current ? 'none' : 'width 0.1s linear',
                borderRadius: 1,
              }}
            />
          </Box>
        ) : null}
      </Stack>

      {hasTracks ? (
        <audio
          ref={audioRef}
          preload="metadata"
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);

            if (!isPresent) {
              return;
            }

            const now = Date.now();
            if (now - lastMusicActivityAtRef.current >= 60 * 1000) {
              lastMusicActivityAtRef.current = now;
              touchCoffeeShopActivity(coffeeShopId);
            }
          }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onEnded={() => {
            if (tracks.length > 1) {
              loadAndPlay((currentIndexRef.current + 1) % tracks.length, true);
            } else {
              setIsPlaying(false);
            }
          }}
          onError={(e) => {
            // Skip to next track if current one fails to load
            if (tracks.length > 1) {
              loadAndPlay((currentIndexRef.current + 1) % tracks.length, true);
            } else {
              setIsPlaying(false);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        >
          <track kind="captions" />
        </audio>
      ) : null}
    </Box>
  );

  return createPortal(panel, portalTarget);
}
