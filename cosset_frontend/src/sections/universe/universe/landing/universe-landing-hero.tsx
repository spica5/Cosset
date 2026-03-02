import type { BoxProps } from '@mui/material/Box';
import type { IUniverseProps } from 'src/types/universe';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Typography } from '@mui/material';
import CardMedia from '@mui/material/CardMedia';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { varAlpha } from 'src/theme/universe/styles';

import { Iconify } from 'src/components/universe/iconify/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  universe: IUniverseProps;
  visitors?: {
    id: string;
    name: string;
    avatarUrl: string;
  }[];
};

export function UniverseLandingHero({ universe, visitors = [], sx, ...other }: Props) {
  const theme = useTheme();
  const [showRoomInfo, setShowRoomInfo] = useState(true);
  const [openGallery, setOpenGallery] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState('');

  const galleryImages = useMemo(() => {
    const gallery = (universe?.gallery || []).filter(Boolean);
    const sources = gallery.length ? gallery : [universe?.heroUrl].filter(Boolean);
    return Array.from(new Set(sources));
  }, [universe?.gallery, universe?.heroUrl]);

  useEffect(() => {
    if (!galleryImages.length) {
      setSelectedBackground(universe?.heroUrl || '');
      return;
    }

    setSelectedBackground((prev) => {
      if (prev && galleryImages.includes(prev)) {
        return prev;
      }

      if (universe?.heroUrl && galleryImages.includes(universe.heroUrl)) {
        return universe.heroUrl;
      }

      return galleryImages[0];
    });
  }, [galleryImages, universe?.heroUrl]);

  useEffect(() => {
    const handleShowRoomInfo = () => {
      setShowRoomInfo(true);

      window.requestAnimationFrame(() => {
        const roomInfo = document.getElementById('room_info');
        roomInfo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };

    const handleToggleRoomInfo = () => {
      setShowRoomInfo((prev) => {
        const next = !prev;

        if (next) {
          window.requestAnimationFrame(() => {
            const roomInfo = document.getElementById('room_info');
            roomInfo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }

        return next;
      });
    };

    window.addEventListener('show-room-info', handleShowRoomInfo);
    window.addEventListener('toggle-room-info', handleToggleRoomInfo);

    return () => {
      window.removeEventListener('show-room-info', handleShowRoomInfo);
      window.removeEventListener('toggle-room-info', handleToggleRoomInfo);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('room-info-state', {
        detail: { visible: showRoomInfo },
      })
    );
  }, [showRoomInfo]);

  if (!universe) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'common.black',
        ...sx,
      }}
      {...other}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        sx={{
          position: 'relative',
          '&::before': {
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            zIndex: 8,
            content: "''",
            position: 'absolute',
            backgroundImage: `linear-gradient(to bottom, ${varAlpha(theme.vars.palette.common.blackChannel, 0)} 0%, ${
              theme.vars.palette.common.black
            } 125%)`,
          },
          [theme.breakpoints.up('md')]: {
            minHeight: 760,
            height: '100vh',
            maxHeight: 1440,
          },
          ...sx,
        }}
        {...other}
      >
        <Box
          id="room_info"
          gap={5}
          display={showRoomInfo ? 'flex' : 'none'}
          alignItems="center"
          flexDirection="column"
          sx={{
            px: { xs: 2, md: 4 },
            py: { xs: 10, md: 12 },
            zIndex: 9,
            textAlign: 'center',
            position: 'relative',
            color: 'common.white',
            borderRadius: 2,
            border: `1px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.24)}`,
            bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.55),
            backdropFilter: 'blur(4px)',
            maxWidth: { xs: '92%', md: 960 },
            mt: { xs: 4, md: 6 },
          }}
        >
          <IconButton
            aria-label="close room info"
            onClick={() => setShowRoomInfo(false)}
            sx={{
              top: 8,
              right: 8,
              position: 'absolute',
              color: 'common.white',
              bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.45),
              '&:hover': {
                bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.65),
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Typography variant="h1" sx={{ color: 'info.main' }}>
            {universe.name}
          </Typography>

          <Typography variant="h2" component="h1" sx={{ maxWidth: { xs: 480, md: 800 } }}>
            {universe.motif}
          </Typography>

          <Typography variant="h3" component="h1" sx={{ maxWidth: 480 }}>
            {universe.mood}
          </Typography>

          <Box
            display="flex"
            flexWrap="wrap"
            alignItems="center"
            justifyContent="center"
            gap={{ xs: 2.5, md: 5 }}
          >
            <Box gap={1} display="flex" alignItems="center" sx={{ typography: 'subtitle2' }}>
              <Iconify width={24} icon="eva:star-fill" sx={{ color: 'primary.main' }} />
              {`${universe.ratingNumber} reviews`}
            </Box>
            <Box gap={1} display="flex" alignItems="center" sx={{ typography: 'subtitle2' }}>
              <Iconify width={24} icon="carbon:friendship" sx={{ color: 'primary.main' }} />
              {`${universe.connections} friends`}
            </Box>
          </Box>
        </Box>
              
        <Box
          component="img"
          alt={universe.name}
          src={selectedBackground || universe.heroUrl}
          sx={{
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            zIndex: 7,
            objectFit: 'cover',
            position: 'absolute',
          }}
        />

        <Card
          sx={{
            top: { xs: 12, md: 20 },
            right: { xs: 12, md: 20 },
            zIndex: 10,
            px: 1.5,
            py: 1.25,
            minWidth: 220,
            position: 'absolute',
            bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.5),
            border: `1px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.2)}`,
            color: 'common.white',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Visitors
          </Typography>
          <Stack spacing={1}>
            {visitors.length ? (
              visitors.map((visitor) => (
                <Stack key={visitor.id} direction="row" spacing={1} alignItems="center">
                  <Avatar src={visitor.avatarUrl || undefined} alt={visitor.name} sx={{ width: 28, height: 28 }} />
                  <Typography variant="body2" noWrap>
                    {visitor.name}
                  </Typography>
                </Stack>
              ))
            ) : (
              <Typography variant="body2" sx={{ color: 'grey.300' }}>
                No visitors yet
              </Typography>
            )}
          </Stack>
        </Card>

        <IconButton
          aria-label="view design space gallery"
          onClick={() => setOpenGallery(true)}
          sx={{
            right: 16,
            bottom: 16,
            zIndex: 10,
            position: 'absolute',
            color: 'common.white',
            bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.5),
            '&:hover': {
              bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.7),
            },
          }}
        >
          <Iconify icon="solar:gallery-wide-bold" width={22} />
        </IconButton>
      </Box>

      <Dialog open={openGallery} onClose={() => setOpenGallery(false)} maxWidth="md" fullWidth>
        <DialogTitle>Design Space Gallery</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            {galleryImages.map((image) => (
              <Grid item xs={12} sm={6} md={4} key={image}>
                <Card variant="outlined">
                  <CardMedia component="img" image={image} alt="Design space" sx={{ height: 180 }} />
                  <Box sx={{ p: 1.5 }}>
                    <Button
                      fullWidth
                      variant={selectedBackground === image ? 'contained' : 'outlined'}
                      onClick={() => {
                        setSelectedBackground(image);
                        setOpenGallery(false);
                      }}
                    >
                      Select
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  )
}