import type { IAlbumItem } from 'src/types/album';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { fDateTime } from 'src/utils/format-time';
import { getS3SignedUrl } from 'src/utils/helper';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { Image } from 'src/components/dashboard/image';
import { Iconify } from 'src/components/dashboard/iconify';
import { Markdown } from 'src/components/dashboard/markdown';
import { useLightBox } from 'src/components/dashboard/lightbox';

import { AlbumImageUpload } from './album-image-upload';
import { AlbumImageGallery } from './album-image-gallery';

// ----------------------------------------------------------------------

type Props = {
  album?: IAlbumItem;
};

export function AlbumDetailsContent({ album }: Props) {
  const [slides, setSlides] = useState<Array<{ src: string; id: number }>>([]);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  const fetchAlbumImages = useCallback(async () => {
    if (!album?.id) {
      setSlides([]);
      return;
    }

    try {
      const res = await axiosInstance.get(endpoints.album.images.list(album.id));
      const images = res.data?.images || [];

      // Convert file_key to signed URLs
      const slidesWithUrls = await Promise.all(
        images.map(async (image: any) => {
          const signedUrl = await getS3SignedUrl(image.fileUrl);
          return { src: signedUrl, id: image.id };
        })
      );

      setSlides(slidesWithUrls);
    } catch (error) {
      console.error('Failed to fetch album images:', error);
      setSlides([]);
    }
  }, [album?.id]);

  useEffect(() => {
    fetchAlbumImages();
  }, [fetchAlbumImages]);

  useEffect(() => {
    const loadCoverUrl = async () => {
      if (!album?.coverUrl) {
        setCoverUrl('');
        return;
      }

      try {
        const signedUrl = await getS3SignedUrl(album.coverUrl);
        setCoverUrl(signedUrl);
      } catch (error) {
        console.error('Failed to load cover URL:', error);
        setCoverUrl('');
      }
    };

    loadCoverUrl();
  }, [album?.coverUrl]);

  const {
    selected: selectedImage,
    open: openLightbox,
    onOpen: handleOpenLightbox,
    onClose: handleCloseLightbox,
  } = useLightBox(slides);

  const handleDelete = async (imageId: number) => {
    try {
      await axiosInstance.delete(endpoints.album.images.delete(album!.id, String(imageId)));
      setOpenDeleteDialog(false);
      setImageToDelete(null);
      fetchAlbumImages();
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleOpenDelete = (imageId: number) => {
    setImageToDelete(imageId);
    setOpenDeleteDialog(true);
  };

  const handleCloseDelete = () => {
    setOpenDeleteDialog(false);
    setImageToDelete(null);
  };

  const getCoverImage = () => coverUrl;

  const renderGallery = (
    <>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h3"> Photo Gallery</Typography>

        <IconButton onClick={() => setOpenUploadDialog(true)}>
          <Typography variant="h6"> Add Photos </Typography>
          <Iconify icon="solar:upload-bold" />
        </IconButton>
      </Stack>

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
      {/* <Box
        gap={1}
        display="grid"
        gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
        sx={{ mb: { xs: 3, md: 5 } }}
      >
        {slides.length > 0 && (
          <>
            <Box
              sx={{
                position: 'relative',
                cursor: 'pointer',
                // width: '100%',
                // aspectRatio: '1/1',
                '&:hover .image-overlay': {
                  opacity: 1,
                },
              }}
              onClick={() => handleOpenLightbox(slides[0].src)}
            >
              <Image
                alt={slides[0].src}
                src={slides[0].src}
                ratio="1/1"
                sx={{
                  borderRadius: 2,
                  transition: (theme) => theme.transitions.create('opacity'),
                  '&:hover': { opacity: 0.8 },
                }}
              />
              <Box
                className="image-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <Tooltip title="Delete">
                  <IconButton
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDelete(slides[0].id);
                    }}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Box gap={1} display="grid" gridTemplateColumns="repeat(2, 1fr)">
              {slides.slice(1, 5).map((slide) => (
                <Box
                  key={slide.src}
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    // width: '100%',
                    // aspectRatio: '1/1',
                    '&:hover .image-overlay': {
                      opacity: 1,
                    },
                  }}
                  onClick={() => handleOpenLightbox(slide.src)}
                >
                  <Image
                    alt={slide.src}
                    src={slide.src}
                    ratio="1/1"
                    sx={{
                      borderRadius: 2,
                      transition: (theme) => theme.transitions.create('opacity'),
                      '&:hover': { opacity: 0.8 },
                    }}
                  />
                  <Box
                    className="image-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDelete(slide.id);
                        }}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box> 

      <Lightbox
        index={selectedImage}
        slides={slides}
        open={openLightbox}
        close={handleCloseLightbox}
      /> */}

      {album?.id && (
        <AlbumImageGallery albumId={String(album.id)} onRefresh={fetchAlbumImages} />
      )}
    </>
  );

  const renderHead = (
    <>
      <Stack direction="row" sx={{ mb: 3 }}>
        <Box sx={{ width: '30%', pr: 2 }}>
          <Image
            src={getCoverImage()}
            alt="Album cover"
            sx={{ width: '100%', height: 'auto', borderRadius: 1 }}
          />
        </Box>
        <Box sx={{ width: '70%' }}>
          <Stack direction="row" alignItems="center">
            <Typography variant="h4" sx={{ flexGrow: 1 }}>
              {album?.title}
            </Typography>

            <IconButton>
              <Iconify icon="solar:share-bold" />
            </IconButton>

            <Checkbox
              defaultChecked
              color="error"
              icon={<Iconify icon="solar:heart-outline" />}
              checkedIcon={<Iconify icon="solar:heart-bold" />}
              inputProps={{ id: 'favorite-checkbox', 'aria-label': 'Favorite checkbox' }}
            />
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'body2' }}>
            <Iconify icon="eva:star-fill" sx={{ color: 'warning.main' }} />
            <Box component="span" sx={{ typography: 'subtitle2' }}>
              {album?.priority}
            </Box>
            <Link sx={{ color: 'text.secondary' }}>(234 reviews)</Link>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'body2' }}>
            <Iconify icon="solar:eye-bold" sx={{ color: 'info.main' }} />
            {album?.totalViews} views
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'subtitle2' }}>
            <Iconify icon="solar:flag-bold" sx={{ color: 'info.main' }} />
            <Box component="span" sx={{ typography: 'body2', color: 'text.secondary' }}>
              Created date:
            </Box>
            {fDateTime(album?.createdAt)}
          </Stack>
        </Box>
      </Stack>
    </>
  );

  const renderContent = (
    <>      
      <Stack spacing={2}>
        <Typography variant="h4"> Description</Typography>
      </Stack>
      
      <Markdown children={album?.description} />
    </>
  );

  return (
    <>
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        {album?.id && (
          <AlbumImageUpload
            albumId={String(album.id)}
            onUploadSuccess={() => {
              setOpenUploadDialog(false);
              fetchAlbumImages();
            }}
          />
        )}
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleCloseDelete}>
        <DialogTitle>Delete Image</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => imageToDelete && handleDelete(imageToDelete)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Stack sx={{ maxWidth: 720, mx: 'auto' }}>
        {renderHead}

        <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

        {renderContent}
      </Stack>

      {renderGallery}
    </>
  );
}
