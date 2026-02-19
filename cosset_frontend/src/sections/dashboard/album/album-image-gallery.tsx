'use client';

import type { IAlbumImage } from 'src/types/album';
import type { Slide } from 'yet-another-react-lightbox';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import axios, { endpoints } from 'src/utils/axios';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';


// ----------------------------------------------------------------------

type Props = {
  albumId: string;
  onRefresh?: () => void;
};

export function AlbumImageGallery({ albumId, onRefresh }: Props) {
  const [images, setImages] = useState<IAlbumImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDelete, setOpenDelete] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  const slides: Slide[] = images
    .filter((img) => img.url)
    .map((img) => ({
      src: img.url!,
      alt: img.imageTitle || 'Album image',
      description: img.description,
    }));

  const lightbox = useLightBox(slides);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(endpoints.album.images.list(albumId));
      setImages(response.data.images || []);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await axios.delete(endpoints.album.images.delete(albumId, String(id)));
      await fetchImages();
      if (onRefresh) onRefresh();
      setOpenDelete(false);
      setImageToDelete(null);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }, [albumId, fetchImages, onRefresh]);

  const handleOpenDelete = useCallback((id: number) => {
    setImageToDelete(id);
    setOpenDelete(true);
  }, []);

  const handleCloseDelete = useCallback(() => {
    setOpenDelete(false);
    setImageToDelete(null);
  }, []);

  const handleImageClick = useCallback((index: number) => {
    lightbox.setSelected(index);
  }, [lightbox]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading images...</Typography>
      </Box>
    );
  }

  if (images.length === 0) {
    return (
      <EmptyContent
        title="No images"
        description="Upload images to get started"
        imgUrl={`${CONFIG.dashboard.assetsDir}/assets/icons/empty/ic-folder-empty.svg`}
      />
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        {images.map((image, index) => (
          <Grid key={image.id} xs={12} sm={6} md={4} lg={3}>
            <Card
              sx={{
                position: 'relative',
                aspectRatio: '1',
                cursor: 'pointer',
                overflow: 'hidden',
                '&:hover .image-overlay': {
                  opacity: 1,
                },
              }}
              onClick={() => handleImageClick(index)}
            >
              {image.url && (
                <Box
                  component="img"
                  src={image.url}
                  alt={image.imageTitle || 'Album image'}
                  sx={{
                    width: 1,
                    height: 1,
                    objectFit: 'cover',
                  }}
                />
              )}

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
                <Tooltip title="View">
                  <IconButton
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageClick(index);
                    }}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <Iconify icon="solar:eye-bold" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDelete(image.id);
                    }}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Tooltip>
              </Box>

              {image.imageTitle && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    p: 1,
                  }}
                >
                  <Typography variant="caption" color="white" noWrap>
                    {image.imageTitle}
                  </Typography>
                </Box>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Lightbox
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />

      <Dialog open={openDelete} onClose={handleCloseDelete}>
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
    </>
  );
}

