'use client';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { uuidv4 } from 'src/utils/uuidv4';
import axiosInstance, { endpoints } from 'src/utils/axios';
import { getS3SignedUrl } from 'src/utils/helper';
import {
  isCoffeeShopGradientBackground,
  parseCoffeeShopBackgroundImages,
  serializeCoffeeShopBackgroundKeys,
} from 'src/utils/coffee-shop-background';
import {
  createDraftMenuItem,
  getCoffeeShopMenuItems,
  serializeCoffeeShopMenuItems,
  type CoffeeShopMenuItem,
} from 'src/utils/coffee-shop-menu';
import {
  createDraftMusicTrack,
  formatMusicTrackFileInfo,
  getCoffeeShopMusicTracks,
  serializeCoffeeShopMusicTracks,
  titleFromAudioFileName,
  type CoffeeShopMusicTrack,
} from 'src/utils/coffee-shop-music';
import {
  COFFEE_SHOP_ATMOSPHERE_OPTIONS,
  DEFAULT_COFFEE_SHOP_ATMOSPHERE,
  hasSparklesAtmosphere,
  hasCandlesAtmosphere,
  parseCoffeeShopAtmosphere,
  getTimeOfDay,
  buildAtmosphereEffect,
  type CoffeeShopAtmosphereEffect,
  type CoffeeShopTimeOfDay,
} from 'src/utils/coffee-shop-atmosphere';

import { CoffeeShopAtmosphereLayers } from 'src/sections/universe/community/coffee-shop-atmosphere-layers';

import {
  useGetCoffeeShop,
  createCoffeeShop,
  updateCoffeeShop,
} from 'src/actions/coffee-shop';
import { uploadFileToS3 } from 'src/actions/upload';
import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';
import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

type Props = {
  coffeeShopId?: string;
};

type FormState = {
  name: string;
  title: string;
  description: string;
  type: string;
  background: string;
};

const DEFAULT_BACKGROUND = 'linear-gradient(120deg, #1d3557 0%, #457b9d 100%)';

const createInitialForm = (): FormState => ({
  name: '',
  title: '',
  description: '',
  type: '1',
  background: DEFAULT_BACKGROUND,
});

export function CoffeeShopCreateEditView({ coffeeShopId }: Props) {
  const router = useRouter();
  const isEditMode = !!coffeeShopId;
  const { user } = useAuthContext();

  const { coffeeShop, coffeeShopLoading } = useGetCoffeeShop(coffeeShopId || '');
  const [form, setForm] = useState<FormState>(createInitialForm());
  const [saving, setSaving] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundResolvedUrls, setBackgroundResolvedUrls] = useState<string[]>([]);
  const [selectedBackgroundPreview, setSelectedBackgroundPreview] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<CoffeeShopMenuItem[]>([]);
  const [menuUploading, setMenuUploading] = useState(false);
  const [menuResolvedUrls, setMenuResolvedUrls] = useState<string[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [musicTracks, setMusicTracks] = useState<CoffeeShopMusicTrack[]>([]);
  const [musicUploading, setMusicUploading] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [atmosphere, setAtmosphere] = useState<CoffeeShopAtmosphereEffect>(
    DEFAULT_COFFEE_SHOP_ATMOSPHERE,
  );

  const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const ownerSegment = String(user?.id || 'guest');
    const entitySegment = coffeeShopId || 'draft';
    const key = `coffee-shops/${ownerSegment}/${entitySegment}/${folder}/${uuidv4()}.${ext}`;

    // Use uploadFileToS3 which handles large files with direct S3 upload
    const result = await uploadFileToS3({ file, key, isPublic: false });
    return result.key || key;
  };

  const handleBackgroundImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];

    if (!selectedFiles.length) {
      return;
    }

    try {
      setBackgroundUploading(true);
      const uploadedKeys = await Promise.all(
        selectedFiles.map((file) => uploadFileToStorage(file, 'background')),
      );

      setForm((prev) => {
        const cur = prev.background.trim();
        const existing = cur.includes('gradient(') ? [] : parseCoffeeShopBackgroundImages(cur);
        const merged = [...existing, ...uploadedKeys];
        return { ...prev, background: serializeCoffeeShopBackgroundKeys(merged) };
      });
    } catch (error) {
      console.error('Failed to upload background images:', error);
    } finally {
      setBackgroundUploading(false);
      event.target.value = '';
    }
  };

  const removeBackgroundImageKey = (keyToRemove: string) => {
    setForm((prev) => {
      const cur = prev.background.trim();
      if (cur.includes('gradient(')) {
        return prev;
      }
      const keys = parseCoffeeShopBackgroundImages(cur).filter((k) => k !== keyToRemove);
      return {
        ...prev,
        background: keys.length ? serializeCoffeeShopBackgroundKeys(keys) : DEFAULT_BACKGROUND,
      };
    });
  };

  const handleUseGradientBackground = () => {
    setForm((prev) => ({ ...prev, background: DEFAULT_BACKGROUND }));
    setSelectedBackgroundPreview(0);
  };

  const handleMenuImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];

    if (!selectedFiles.length) {
      return;
    }

    try {
      setMenuUploading(true);
      const newItems = await Promise.all(
        selectedFiles.map(async (file) => {
          const key = await uploadFileToStorage(file, 'menu');
          return createDraftMenuItem(key);
        }),
      );

      setMenuItems((prev) => [...prev, ...newItems]);
      setMenuError(null);
    } catch (error) {
      console.error('Failed to upload menu images:', error);
    } finally {
      setMenuUploading(false);
      event.target.value = '';
    }
  };

  const removeMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateMenuItemName = (id: string, name: string) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  };

  const updateMenuItemPrice = (id: string, price: string) => {
    const parsed = price.trim() === '' ? null : Number.parseFloat(price);
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, price: parsed != null && !Number.isNaN(parsed) ? parsed : null } : item,
      ),
    );
  };

  const downloadMusicTrack = async (track: CoffeeShopMusicTrack) => {
    try {
      const audioUrl = track.audioUrl.trim();
      if (!audioUrl) {
        return;
      }

      // If it's already a full URL, use it directly; otherwise get a signed URL
      const downloadUrl =
        audioUrl.startsWith('http://') || audioUrl.startsWith('https://')
          ? audioUrl
          : await getS3SignedUrl(audioUrl);

      if (!downloadUrl) {
        return;
      }

      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${track.title}.${track.extension || 'mp3'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download music track:', error);
    }
  };

  const handleMusicFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];

    if (!selectedFiles.length) {
      return;
    }

    try {
      setMusicUploading(true);
      const newTracks = await Promise.all(
        selectedFiles.map(async (file) => {
          const key = await uploadFileToStorage(file, 'music');
          const extension = file.name.split('.').pop()?.toLowerCase() || '';
          return createDraftMusicTrack(key, titleFromAudioFileName(file.name), {
            fileSize: file.size,
            extension,
          });
        }),
      );

      setMusicTracks((prev) => [...prev, ...newTracks]);
      setMusicError(null);
    } catch (error) {
      console.error('Failed to upload music files:', error);
      setMusicError('Failed to upload one or more audio files.');
    } finally {
      setMusicUploading(false);
      event.target.value = '';
    }
  };

  const removeMusicTrack = (id: string) => {
    setMusicTracks((prev) => prev.filter((track) => track.id !== id));
  };

  const updateMusicTrackTitle = (id: string, title: string) => {
    setMusicTracks((prev) =>
      prev.map((track) => (track.id === id ? { ...track, title } : track)),
    );
  };

  useEffect(() => {
    if (!isEditMode || !coffeeShop) {
      return;
    }

    setForm({
      name: coffeeShop.name || '',
      title: coffeeShop.title || '',
      description: coffeeShop.description || '',
      type: String(coffeeShop.type ?? 1),
      background: coffeeShop.background || DEFAULT_BACKGROUND,
    });
    setMenuItems(getCoffeeShopMenuItems(coffeeShop.menu, coffeeShop.files));
    setMusicTracks(getCoffeeShopMusicTracks(coffeeShop.music));
    setAtmosphere(parseCoffeeShopAtmosphere(coffeeShop.atmosphere));
  }, [coffeeShop, isEditMode]);

  useEffect(() => {
    let mounted = true;

    const resolveMenuImages = async () => {
      const urls = await Promise.all(
        menuItems.map(async (item) => {
          const key = item.imageUrl.trim();
          if (!key) {
            return '';
          }
          if (key.startsWith('http://') || key.startsWith('https://')) {
            return key;
          }
          return (await getS3SignedUrl(key)) || '';
        }),
      );

      if (mounted) {
        setMenuResolvedUrls(urls);
      }
    };

    resolveMenuImages();

    return () => {
      mounted = false;
    };
  }, [menuItems]);

  useEffect(() => {
    let mounted = true;

    const resolveBackgroundImages = async () => {
      const normalized = form.background.trim();

      if (!normalized || normalized.includes('gradient(')) {
        if (mounted) {
          setBackgroundResolvedUrls([]);
        }
        return;
      }

      const keys = parseCoffeeShopBackgroundImages(normalized);
      if (!keys.length) {
        if (mounted) {
          setBackgroundResolvedUrls([]);
        }
        return;
      }

      const urls = await Promise.all(
        keys.map(async (key) => {
          if (key.startsWith('http://') || key.startsWith('https://')) {
            return key;
          }
          return (await getS3SignedUrl(key)) || '';
        }),
      );

      if (mounted) {
        setBackgroundResolvedUrls(urls.filter(Boolean));
      }
    };

    resolveBackgroundImages();

    return () => {
      mounted = false;
    };
  }, [form.background]);

  useEffect(() => {
    setSelectedBackgroundPreview((i) => {
      if (!backgroundResolvedUrls.length) {
        return 0;
      }
      return Math.min(i, backgroundResolvedUrls.length - 1);
    });
  }, [backgroundResolvedUrls.length]);

  const heading = useMemo(
    () => (isEditMode ? 'Edit Coffee Shop' : 'Create Coffee Shop'),
    [isEditMode],
  );

  const backgroundKeysForThumbs = useMemo(() => {
    if (isCoffeeShopGradientBackground(form.background)) {
      return [];
    }
    return parseCoffeeShopBackgroundImages(form.background);
  }, [form.background]);

  const backgroundPreviewUrl =
    backgroundResolvedUrls.length > 0
      ? backgroundResolvedUrls[
          Math.min(selectedBackgroundPreview, backgroundResolvedUrls.length - 1)
        ] || ''
      : '';

  const hasBackgroundPreview =
    Boolean(backgroundPreviewUrl) || isCoffeeShopGradientBackground(form.background);

  const atmospherePreviewSeed = coffeeShopId || form.name || 'draft';

  const handleSave = async () => {
    const normalizedName = form.name.trim();
    const normalizedTitle = form.title.trim();

    if (!normalizedName || !normalizedTitle) {
      return;
    }

    const itemsMissingName = menuItems.filter(
      (item) => item.imageUrl.trim() && !item.name.trim(),
    );
    if (itemsMissingName.length) {
      setMenuError('Enter a name for each uploaded drink before saving.');
      return;
    }

    const tracksMissingTitle = musicTracks.filter(
      (track) => track.audioUrl.trim() && !track.title.trim(),
    );
    if (tracksMissingTitle.length) {
      setMusicError('Enter a title for each uploaded music file before saving.');
      return;
    }

    const parsedType = Number.parseInt(form.type, 10);

    try {
      setSaving(true);
      setMenuError(null);
      setMusicError(null);

      const serializedMenu = serializeCoffeeShopMenuItems(menuItems);
      const serializedMusic = serializeCoffeeShopMusicTracks(musicTracks);

      const payload = {
        name: normalizedName,
        title: normalizedTitle,
        description: form.description.trim() || null,
        type: Number.isNaN(parsedType) ? 1 : parsedType,
        background: form.background.trim() || DEFAULT_BACKGROUND,
        menu: serializedMenu || null,
        music: serializedMusic || null,
        atmosphere,
      };

      if (isEditMode && coffeeShopId) {
        await updateCoffeeShop(coffeeShopId, payload);
      } else {
        await createCoffeeShop(payload);
      }

      router.push(paths.dashboard.community.coffeeShop.list);
    } catch (error) {
      console.error('Failed to save coffee shop:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditMode && coffeeShopLoading) {
    return (
      <DashboardContent>
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (isEditMode && !coffeeShopLoading && !coffeeShop) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Coffee Shop"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Community' },
            { name: 'Coffee Shops', href: paths.dashboard.community.coffeeShop.list },
            { name: 'Edit' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <EmptyContent title="Coffee shop not found" filled sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: 'Coffee Shops', href: paths.dashboard.community.coffeeShop.list },
          { name: isEditMode ? 'Edit' : 'Create' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />

          <TextField
            label="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            multiline
            minRows={4}
          />

          <TextField
            label="Type"
            type="number"
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            flexWrap="wrap"
          >
            <Button
              variant="outlined"
              component="label"
              disabled={backgroundUploading || saving}
              sx={{ width: { xs: 1, sm: 'auto' } }}
            >
              {backgroundUploading ? 'Uploading…' : 'Upload background images'}
              <input
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={handleBackgroundImagesUpload}
              />
            </Button>

            <Button variant="text" size="small" onClick={handleUseGradientBackground} disabled={saving}>
              Use default gradient
            </Button>

            <Typography variant="caption" color="text.secondary">
              {isCoffeeShopGradientBackground(form.background)
                ? 'Using CSS gradient'
                : backgroundKeysForThumbs.length
                  ? `${backgroundKeysForThumbs.length} image(s) — pick a thumbnail below to preview`
                  : 'Add one or more images for the universe page background'}
            </Typography>
          </Stack>

          <Typography variant="subtitle2">Universe atmosphere</Typography>

          <Stack spacing={1.5}>
            {/* Time of Day Selection */}
            <Stack>
              <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary' }}>
                Time of day
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={getTimeOfDay(atmosphere)}
                onChange={(_event, value: CoffeeShopTimeOfDay | null) => {
                  if (value) {
                    const newAtmosphere = buildAtmosphereEffect(
                      value,
                      hasSparklesAtmosphere(atmosphere),
                      hasCandlesAtmosphere(atmosphere),
                    );
                    setAtmosphere(newAtmosphere);
                  }
                }}
                size="small"
                sx={{
                  width: { xs: 1, sm: 'fit-content' },
                  flexWrap: 'wrap',
                  '& .MuiToggleButton-root': {
                    flex: { xs: 1, sm: 'none' },
                  },
                }}
              >
                <ToggleButton value="day" disabled={saving}>
                  Day
                </ToggleButton>
                <ToggleButton value="evening" disabled={saving}>
                  Evening
                </ToggleButton>
                <ToggleButton value="night" disabled={saving}>
                  Night
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {/* Effects Selection */}
            <Stack>
              <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary' }}>
                Effects
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasSparklesAtmosphere(atmosphere)}
                      onChange={(e) => {
                        const newAtmosphere = buildAtmosphereEffect(
                          getTimeOfDay(atmosphere),
                          e.target.checked,
                          hasCandlesAtmosphere(atmosphere),
                        );
                        setAtmosphere(newAtmosphere);
                      }}
                      disabled={saving}
                    />
                  }
                  label="Sparkles"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasCandlesAtmosphere(atmosphere)}
                      onChange={(e) => {
                        const newAtmosphere = buildAtmosphereEffect(
                          getTimeOfDay(atmosphere),
                          hasSparklesAtmosphere(atmosphere),
                          e.target.checked,
                        );
                        setAtmosphere(newAtmosphere);
                      }}
                      disabled={saving}
                    />
                  }
                  label="Candles"
                />
              </Stack>
            </Stack>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {COFFEE_SHOP_ATMOSPHERE_OPTIONS.find((o) => o.value === atmosphere)?.description}
            {' — '}
            Shown on the universe coffee-shop page.
          </Typography>

          <Box
            onClick={() => {
              if (hasBackgroundPreview) {
                setPreviewOpen(true);
              }
            }}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              maxWidth: { xs: 1, sm: 400 },
              mx: 'auto',
              height: { xs: 220, sm: 260, md: 300 },
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#0b0f14',
              cursor: hasBackgroundPreview ? 'zoom-in' : 'default',
            }}
          >
            {hasBackgroundPreview ? (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: isCoffeeShopGradientBackground(form.background)
                    ? form.background
                    : undefined,
                  backgroundImage: backgroundPreviewUrl ? `url(${backgroundPreviewUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ) : (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'background.neutral',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Background preview will appear here
                </Typography>
              </Box>
            )}

            <CoffeeShopAtmosphereLayers
              atmosphere={atmosphere}
              seed={atmospherePreviewSeed}
              layout="contained"
            />
          </Box>

          {backgroundKeysForThumbs.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
              {backgroundKeysForThumbs.map((key, index) => {
                const thumbUrl = backgroundResolvedUrls[index];
                return (
                  <Box
                    key={key}
                    sx={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor:
                        index === selectedBackgroundPreview ? 'primary.main' : 'divider',
                      boxShadow:
                        index === selectedBackgroundPreview
                          ? (theme) => `0 0 0 2px ${theme.palette.primary.main}33`
                          : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedBackgroundPreview(index)}
                  >
                    {thumbUrl ? (
                      <Box
                        component="img"
                        alt=""
                        src={thumbUrl}
                        sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <Box sx={{ width: 1, height: 1, display: 'grid', placeItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          …
                        </Typography>
                      </Box>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBackgroundImageKey(key);
                      }}
                      disabled={saving}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bgcolor: 'rgba(0,0,0,0.45)',
                        color: 'common.white',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                      }}
                    >
                      <Iconify icon="mingcute:close-line" width={14} />
                    </IconButton>
                  </Box>
                );
              })}
            </Stack>
          )}

          <Typography variant="subtitle2">Coffee menu</Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} flexWrap="wrap">
            <Button variant="outlined" component="label" disabled={menuUploading || saving}>
              {menuUploading ? 'Uploading…' : 'Upload drink images'}
              <input
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={handleMenuImagesUpload}
              />
            </Button>
            <Typography variant="caption" color="text.secondary">
              {menuItems.length
                ? 'Add a name and price for each uploaded drink below, then save.'
                : 'Upload drink images first, then add name and price for each item.'}
            </Typography>
          </Stack>

          {menuError ? (
            <Typography variant="caption" color="error">
              {menuError}
            </Typography>
          ) : null}

{menuItems.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(auto-fill, minmax(160px, 1fr))',
                },
              }}
            >
              {menuItems.map((item, index) => {
                const thumbUrl = menuResolvedUrls[index];
                return (
                  <Stack key={item.id} spacing={0.75} sx={{ width: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: 1,
                        pt: '75%',
                        borderRadius: 1,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {thumbUrl ? (
                        <Box
                          component="img"
                          alt={item.name}
                          src={thumbUrl}
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            width: 1,
                            height: 1,
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <CircularProgress size={20} />
                        </Box>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => removeMenuItem(item.id)}
                        disabled={saving}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bgcolor: 'rgba(0,0,0,0.45)',
                          color: 'common.white',
                        }}
                      >
                        <Iconify icon="mingcute:close-line" width={14} />
                      </IconButton>
                    </Box>
                    <TextField
                      size="small"
                      label="Name"
                      placeholder="Drink name"
                      value={item.name}
                      onChange={(e) => {
                        updateMenuItemName(item.id, e.target.value);
                        setMenuError(null);
                      }}
                      disabled={saving}
                      required
                      error={!item.name.trim()}
                      helperText={!item.name.trim() ? 'Required after upload' : ' '}
                    />
                    <TextField
                      size="small"
                      label="Price"
                      placeholder="0.00"
                      type="number"
                      value={item.price ?? ''}
                      onChange={(e) => updateMenuItemPrice(item.id, e.target.value)}
                      disabled={saving}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Stack>
                );
              })}
            </Box>
          )}

          <Typography variant="subtitle2" sx={{ pt: 1 }}>
            Background music
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} flexWrap="wrap">
            <Button variant="outlined" component="label" disabled={musicUploading || saving}>
              {musicUploading ? 'Uploading…' : 'Upload music files'}
              <input
                hidden
                type="file"
                accept=".mp3,.wav,.aac,.ogg,.m4a,.flac,audio/*"
                multiple
                onChange={handleMusicFilesUpload}
              />
            </Button>
            <Typography variant="caption" color="text.secondary">
              {musicTracks.length
                ? 'Edit track titles below. Music plays on the coffee-shop page.'
                : 'Upload MP3 or other audio files for the music player.'}
            </Typography>
          </Stack>

          {musicError ? (
            <Typography variant="caption" color="error">
              {musicError}
            </Typography>
          ) : null}

          {musicTracks.length > 0 && (
            <Stack spacing={1}>
              {musicTracks.map((track) => (
                <Stack
                  key={track.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                >
                  <TextField
                    size="small"
                    label="Track title"
                    value={track.title}
                    onChange={(e) => {
                      updateMusicTrackTitle(track.id, e.target.value);
                      setMusicError(null);
                    }}
                    disabled={saving}
                    required
                    error={!track.title.trim()}
                    helperText={!track.title.trim() ? 'Required' : ' '}
                    sx={{ flex: 1, minWidth: { xs: 0, sm: 200 } }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flex: 1, minWidth: { xs: 0, sm: 88 } }}
                  >
                    {formatMusicTrackFileInfo(track)}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => downloadMusicTrack(track)}
                    disabled={saving}
                    aria-label="Download music track"
                    title="Download track"
                  >
                    <Iconify icon="mingcute:download-line" width={18} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => removeMusicTrack(track.id)}
                    disabled={saving}
                    aria-label="Remove music track"
                  >
                    <Iconify icon="mingcute:close-line" width={18} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}

          

          <Dialog fullScreen open={previewOpen} onClose={() => setPreviewOpen(false)}>
            <Box
              sx={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                bgcolor: 'common.black',
                display: 'grid',
                placeItems: 'center',
                p: { xs: 1, md: 3 },
              }}
            >
              <IconButton
                onClick={() => setPreviewOpen(false)}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  color: 'common.white',
                  border: '1px solid',
                  borderColor: 'rgba(255,255,255,0.35)',
                }}
              >
                X
              </IconButton>

              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 1,
                  bgcolor: 'common.black',
                  background: isCoffeeShopGradientBackground(form.background) ? form.background : undefined,
                  backgroundImage: backgroundPreviewUrl ? `url(${backgroundPreviewUrl})` : undefined,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </Box>
          </Dialog>

          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1.5}
            justifyContent="flex-end"
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Button
              color="inherit"
              onClick={() => router.push(paths.dashboard.community.coffeeShop.list)}
              disabled={saving}
              sx={{ width: { xs: 1, sm: 'auto' } }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{ width: { xs: 1, sm: 'auto' } }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
