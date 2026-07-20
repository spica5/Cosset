'use client';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/universe/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';

// ----------------------------------------------------------------------

function isDirectUrl(value: string) {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  );
}

async function resolveImageUrl(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (isDirectUrl(raw)) {
    return raw;
  }

  return (await getS3SignedUrl(raw.replace(/^public:/, ''))) || '';
}

type SingleProps = {
  label: string;
  value?: string | null;
  disabled?: boolean;
  uploading?: boolean;
  helperText?: string;
  onUpload: (file: File) => void | Promise<void>;
  onRemove: () => void;
  previewHeight?: number;
};

export function BrandImageField({
  label,
  value,
  disabled,
  uploading,
  helperText,
  onUpload,
  onRemove,
  previewHeight = 140,
}: SingleProps) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    resolveImageUrl(value).then((url) => {
      if (mounted) setPreviewUrl(url);
    });

    return () => {
      mounted = false;
    };
  }, [value]);

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2">{label}</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Button variant="outlined" component="label" disabled={disabled || uploading}>
          {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                Promise.resolve(onUpload(file)).catch(() => undefined);
              }
              event.target.value = '';
            }}
          />
        </Button>

        {value ? (
          <Button
            variant="text"
            size="small"
            color="error"
            disabled={disabled || uploading}
            onClick={onRemove}
          >
            Remove
          </Button>
        ) : null}

        {helperText ? (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        ) : null}
      </Stack>

      {previewUrl ? (
        <Box
          component="img"
          src={previewUrl}
          alt={label}
          sx={{
            width: 1,
            maxWidth: 280,
            height: previewHeight,
            objectFit: 'cover',
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.neutral',
          }}
        />
      ) : null}
    </Stack>
  );
}

type MultiProps = {
  label: string;
  values: string[];
  disabled?: boolean;
  uploading?: boolean;
  helperText?: string;
  onUpload: (files: File[]) => void | Promise<void>;
  onRemove: (index: number) => void;
};

export function BrandMultiImageField({
  label,
  values,
  disabled,
  uploading,
  helperText,
  onUpload,
  onRemove,
}: MultiProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.all(values.map((value) => resolveImageUrl(value))).then((urls) => {
      if (mounted) setPreviewUrls(urls);
    });

    return () => {
      mounted = false;
    };
  }, [values]);

  const slides = useMemo(
    () => previewUrls.filter(Boolean).map((src) => ({ src })),
    [previewUrls],
  );
  const lightbox = useLightBox(slides);

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2">{label}</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Button variant="outlined" component="label" disabled={disabled || uploading}>
          {uploading ? 'Uploading…' : 'Upload images'}
          <input
            hidden
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              if (files.length) {
                Promise.resolve(onUpload(files)).catch(() => undefined);
              }
              event.target.value = '';
            }}
          />
        </Button>

        {helperText ? (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        ) : null}
      </Stack>

      {previewUrls.length ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
            gap: 1,
          }}
        >
          {previewUrls.map((url, index) =>
            url ? (
              <Box
                key={`${values[index] || url}-${index}`}
                sx={{
                  position: 'relative',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.neutral',
                }}
              >
                <Box
                  component="img"
                  src={url}
                  alt={`${label} ${index + 1}`}
                  onClick={() => lightbox.onOpen(url)}
                  sx={{
                    width: 1,
                    height: 96,
                    objectFit: 'cover',
                    display: 'block',
                    cursor: 'zoom-in',
                  }}
                />
                <IconButton
                  size="small"
                  color="error"
                  disabled={disabled || uploading}
                  onClick={() => onRemove(index)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  }}
                >
                  <Iconify icon="mingcute:close-line" width={16} />
                </IconButton>
              </Box>
            ) : null,
          )}
        </Box>
      ) : null}

      <Lightbox
        index={lightbox.selected}
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
      />
    </Stack>
  );
}

type ThumbnailProps = {
  imageKey?: string | null;
  alt: string;
  height?: number;
  onClick?: () => void;
};

export function BrandImageThumbnail({ imageKey, alt, height = 140, onClick }: ThumbnailProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    resolveImageUrl(imageKey).then((resolved) => {
      if (mounted) setUrl(resolved);
    });

    return () => {
      mounted = false;
    };
  }, [imageKey]);

  if (!url) {
    return null;
  }

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      onClick={onClick}
      sx={{
        width: 1,
        height,
        objectFit: 'cover',
        borderRadius: 1,
        bgcolor: 'background.neutral',
        cursor: onClick ? 'zoom-in' : 'default',
      }}
    />
  );
}

type GalleryProps = {
  imageKeys: string[];
  alt: string;
  height?: number;
};

export function BrandProductImageGallery({ imageKeys, alt, height = 180 }: GalleryProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const imageKeysKey = imageKeys.map((key) => String(key || '').trim()).filter(Boolean).join('|');

  useEffect(() => {
    let mounted = true;
    const keys = imageKeysKey ? imageKeysKey.split('|') : [];

    if (!keys.length) {
      setPreviewUrls([]);
      return undefined;
    }

    Promise.all(keys.map((key) => resolveImageUrl(key))).then((urls) => {
      if (mounted) setPreviewUrls(urls.filter(Boolean));
    });

    return () => {
      mounted = false;
    };
  }, [imageKeysKey]);

  const slides = useMemo(
    () => previewUrls.map((src) => ({ src })),
    [previewUrls],
  );
  const lightbox = useLightBox(slides);

  const handleOpen = (index: number) => {
    if (index < 0 || index >= previewUrls.length) return;
    lightbox.setSelected(index);
  };

  if (!previewUrls.length) {
    return <Box sx={{ height, bgcolor: 'background.neutral' }} />;
  }

  return (
    <>
      <Box
        component="img"
        src={previewUrls[0]}
        alt={alt}
        onClick={() => handleOpen(0)}
        sx={{
          width: 1,
          height,
          objectFit: 'cover',
          display: 'block',
          cursor: 'zoom-in',
          bgcolor: 'background.neutral',
        }}
      />

      {previewUrls.length > 1 ? (
        <Stack direction="row" spacing={0.75} sx={{ p: 1, overflowX: 'auto' }}>
          {previewUrls.map((url, index) => (
            <Box
              key={`${url}-${index}`}
              component="img"
              src={url}
              alt={`${alt} ${index + 1}`}
              onClick={() => handleOpen(index)}
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                objectFit: 'cover',
                cursor: 'zoom-in',
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>
      ) : null}

      <Lightbox
        index={lightbox.selected}
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        disableCaptions
        disableSlideshow
      />
    </>
  );
}
