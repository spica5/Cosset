import type { IGiftItem } from 'src/types/gift';
import type { Slide } from 'yet-another-react-lightbox';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { Image } from 'src/components/dashboard/image';
import { Iconify } from 'src/components/dashboard/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';
import { usePopover, CustomPopover } from 'src/components/dashboard/custom-popover';

// ----------------------------------------------------------------------

type Props = {
  gift: IGiftItem;
  onView: () => void;
  onDelete: () => void;
};

export function GiftItem({ gift, onView, onDelete }: Props) {
  const popover = usePopover();
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const loadImages = async () => {
      if (!gift.images) return;

      let keys: string[] = [];
      try {
        if (typeof gift.images === 'string') {
          const parsed = JSON.parse(gift.images);
          if (Array.isArray(parsed)) keys = parsed;
        } else if (Array.isArray(gift.images)) {
          keys = gift.images as unknown as string[];
        }
      } catch (err) {
        keys = [];
      }

      if (!keys.length) return;

      const urls: string[] = [];
      const fetches = await Promise.all(
        keys.map(async (key) => {
          try {
            const res = await axiosInstance.get(endpoints.upload.image, { params: { key } });
            return (res.data?.url as string) || '';
          } catch (error) {
            return '';
          }
        })
      );

      fetches.forEach((url) => {
        if (url) urls.push(url);
      });

      setImageUrls(urls);
      if (urls.length > 0) setCoverUrl(urls[0]);
    };

    loadImages();
  }, [gift.images]);

  const slides: Slide[] = imageUrls.map((url) => ({
    src: url,
  }));

  const lightbox = useLightBox(slides);

  const renderImages = (
    <Box sx={{ p: 1 }}>
      {imageUrls.length === 0 ? (
        <>
        <Box
          sx={{
            width: 1,
            height: 164,
            borderRadius: 1,
            bgcolor: 'background.neutral',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mb: 1,
          }}
        >
          <Iconify icon="solar:image-broken" sx={{ width: 48, height: 48, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.disabled">
            No Image
          </Typography>
        </Box>
        <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: 0.75,
              bgcolor: 'background.neutral',
              display: 'flex',}}
          >
        </Box>
      </>
      ) : (
        <>
          {/* Main image */}
          {coverUrl && (
            <Box
              onClick={() => {
                lightbox.setSelected(selectedImageIndex);
              }}
              sx={{
                cursor: 'pointer',
                mb: 1,
                borderRadius: 1,
                overflow: 'hidden',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.8 },
              }}
            >
              <Image
                alt={gift.title}
                src={coverUrl}
                sx={{ width: 1, height: 164, borderRadius: 1 }}
              />
            </Box>
          )}

          {/* Thumbnail strip */}
          {imageUrls.length > 1 && (
            <Box sx={{ display: 'flex', gap: 0.5, overflow: 'auto', pb: 0.5 }}>
              {imageUrls.map((url, idx) => (
                <Box
                  key={url}
                  onClick={() => {
                    setCoverUrl(url);
                    setSelectedImageIndex(idx);
                  }}
                  sx={{
                    cursor: 'pointer',
                    width: 50,
                    height: 50,
                    flexShrink: 0,
                    borderRadius: 0.75,
                    overflow: 'hidden',
                    border: selectedImageIndex === idx ? '2px solid' : '1px solid',
                    borderColor: selectedImageIndex === idx ? 'primary.main' : 'divider',
                    transition: 'all 0.2s',
                    '&:hover': { opacity: 0.8 },
                  }}
                >
                  <Box component="img" src={url} alt={`thumb-${idx}`} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );

  const renderTexts = (
    <ListItemText
      sx={{ p: (theme) => theme.spacing(2.5, 2.5, 2, 2.5) }}
      primary={`Created date: ${fDateTime(gift.createdAt)}`}
      secondary={
        <Link component={RouterLink} href={paths.dashboard.drawer.gift.details(String(gift.id))} color="inherit">
          {gift.title}
        </Link>
      }
      primaryTypographyProps={{ typography: 'caption', color: 'text.disabled' }}
      secondaryTypographyProps={{
        mt: 1,
        noWrap: true,
        component: 'span',
        color: 'text.primary',
        typography: 'subtitle1',
      }}
    />
  );

  const renderInfo = (
    <Stack
      spacing={1.5}
      sx={{ position: 'relative', p: (theme) => theme.spacing(0, 2.5, 2.5, 2.5) }}
    >
      <IconButton onClick={popover.onOpen} sx={{ position: 'absolute', bottom: 20, right: 8 }}>
        <Iconify icon="eva:more-vertical-fill" />
      </IconButton>

      {[
        {
          icon: <Iconify icon="eva:person-fill" sx={{ color: 'warning.main' }} />,
          label: gift.receivedFrom,
        },
        {
          icon: <Iconify icon="solar:calendar-bold" sx={{ color: 'info.main' }} />,
          label: gift.receivedDate,
        },
        {
          icon: <Iconify icon="solar:heart-bold" sx={{ color: 'primary.main' }} />,
          label: gift.category,
        },
      ].map((item, i) => (
        <Stack
          key={`info-${i}`}
          spacing={1}
          direction="row"
          alignItems="center"
          sx={{ typography: 'body2' }}
        >
          {item.icon}
          {item.label}
        </Stack>
      ))}
    </Stack>
  );

  return (
    <>
      <Card>
        {renderImages}

        {renderTexts}

        {renderInfo}
      </Card>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              popover.onClose();
              onView();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              popover.onClose();
              onDelete();
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <Lightbox
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />
    </>
  );
}
