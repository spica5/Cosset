import type { Slide } from 'yet-another-react-lightbox';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip/Tooltip';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';

import { Image } from 'src/components/dashboard/image';
import { Iconify } from 'src/components/dashboard/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';


// ----------------------------------------------------------------------

type Props = {
  images: Array<File | string>;
  previewSrc: string | null;
  setPreviewSrc: (s: string | null) => void;
  /** Called when the user confirms deletion of an image (parent should remove it) */
  onRemoveGalleryFile?: (inputFile: File | string) => void;
  /** Called to reorder images in parent state */
  onReorderGalleryImage?: (fromIndex: number, toIndex: number) => void;
};

export default function ImageGallery({
  images,
  previewSrc,
  setPreviewSrc,
  onRemoveGalleryFile,
  onReorderGalleryImage,
}: Props) {
  const [sliderIndex, setSliderIndex] = useState(0);
  const [openDelete, setOpenDelete] = useState(false);
  // store the actual item (File | url string) to delete — more reliable than an index
  const [imageToDelete, setImageToDelete] = useState<File | string | null>(null);

  const slides: Slide[] = images.map((fileOrUrl, idx) => {
    const imageUrl = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl as File);
    return {
      src: imageUrl,
      alt: `Image ${idx + 1}`,
      description: `Image ${idx + 1} of ${images.length}`,
    };
  });

  // Initialize slider index when preview opens or previewSrc changes
  useEffect(() => {
    if (previewSrc) {
      const index = images.findIndex((file) => {
        const src = typeof file === 'string' ? file : URL.createObjectURL(file as File);
        return src === previewSrc;
      });
      if (index !== -1) {
        setSliderIndex(index);
      }
    }
  }, [previewSrc, images]);

  const lightbox = useLightBox(slides);

  const tooltipIconButtonSx = {
    bgcolor: 'background.paper',
    width: 20,
    height: 20,
    p: 1,
  } as const;

  const actionIconButtonSx = {
    bgcolor: 'background.paper',
    border: '1px solid',
    width: 25,
    height: 25,
    p: 2,
    cursor: 'pointer',
  } as const;

  const handleDelete = useCallback(async (input: File | string) => {
    try {
      // Close dialog and clear preview in the gallery
      setOpenDelete(false);
      setImageToDelete(null);
      setPreviewSrc(null);

      // Notify parent with the original item: pass `string` for URLs or `File` for new files
      if (typeof onRemoveGalleryFile === 'function') {
        onRemoveGalleryFile(input);
      }

      // eslint-disable-next-line no-console
      console.log('Delete requested for image', input);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }, [onRemoveGalleryFile, setPreviewSrc]);

  const handleOpenDelete = useCallback((item: File | string) => {
    setImageToDelete(item);
    setOpenDelete(true);
  }, []);

  const handleCloseDelete = useCallback(() => {
    setOpenDelete(false);
    setImageToDelete(null);
  }, []);

  const handleImageClick = useCallback((index: number) => {
    if (index === 0) {
        lightbox.setSelected(sliderIndex);
    } else {
        lightbox.setSelected(index);
    }
  }, [lightbox, sliderIndex]);

  const handleMoveImage = useCallback(
    (index: number, direction: 'up' | 'down' | 'first' | 'last') => {
      if (!onReorderGalleryImage) return;

      const nextIndex =
        direction === 'first'
          ? 0
          : direction === 'last'
            ? images.length - 1
            : direction === 'up'
              ? index - 1
              : index + 1;

      if (nextIndex < 0 || nextIndex >= images.length) return;

      onReorderGalleryImage(index, nextIndex);
    },
    [images.length, onReorderGalleryImage]
  );

  const selectedImageIndex = useMemo(() => {
    if (images.length === 0) {
      return -1;
    }

    if (!previewSrc) {
      return 0;
    }

    const indexByUrl = images.findIndex((file) => typeof file === 'string' && file === previewSrc);

    if (indexByUrl !== -1) {
      return indexByUrl;
    }

    return Math.min(sliderIndex, images.length - 1);
  }, [images, previewSrc, sliderIndex]);

  return (
    <>
      <Card>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={9}>
              {(() => {
                const first = images && images.length > 0 ? images[0] : null;
                if (!first) {
                  return (
                    <Box sx={{ width: '100%', height: 360, bgcolor: 'background.default', borderRadius: 1 }} />
                  );
                }

                const src = previewSrc || (typeof first === 'string' ? first : URL.createObjectURL(first as File));

                return (
                  <Box onClick={() => handleImageClick(0)} sx={{ cursor: 'pointer' }}>
                    <Image alt="preview" src={src} sx={{ width: 1, height: 360, borderRadius: 1 }} />
                  </Box>
                );
              })()}
            </Grid>

            <Grid item xs={12} md={1}>
              <Stack spacing={2} alignItems="center" pt = {5}>
                <Tooltip title="Move first">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveImage(selectedImageIndex, 'first');
                      }}
                      disabled={selectedImageIndex <= 0}
                      sx={actionIconButtonSx}
                    >
                      <KeyboardDoubleArrowUpIcon sx={{ width: 25, height: 25 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              
                <Tooltip title="Move up">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveImage(selectedImageIndex, 'up');
                      }}
                      disabled={selectedImageIndex <= 0}
                      sx={actionIconButtonSx}
                    >
                      <Iconify icon="solar:alt-arrow-up-bold" width={25} height={25} />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Move down">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveImage(selectedImageIndex, 'down');
                      }}
                      disabled={selectedImageIndex === -1 || selectedImageIndex >= images.length - 1}
                      sx={actionIconButtonSx}
                    >
                      <Iconify icon="solar:alt-arrow-down-bold" width={25} height={25} />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Move last">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveImage(selectedImageIndex, 'last');
                      }}
                      disabled={selectedImageIndex === -1 || selectedImageIndex >= images.length - 1}
                      sx={actionIconButtonSx}
                    >
                      <KeyboardDoubleArrowDownIcon sx={{ width: 25, height: 25 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Grid>
            <Grid item xs={12} md={2}>
              <Stack 
                spacing={1} 
                sx={{ 
                  maxHeight: 360, 
                  height: 360,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  pr: 1,
                  scrollBehavior: 'smooth',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: 'rgba(0, 0, 0, 0.05)',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '10px',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.3)',
                    },
                  },
                }}
              >
                {(images || []).map((fileOrUrl, idx) => {
                  const src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl as File);
                  const isSelected = previewSrc === src;

                  return (                   
                    <Card
                        key={idx}
                        sx={{
                            width: 1,
                            height: 84,
                            minHeight: 84,
                            borderRadius: 1,
                            position: 'relative',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: isSelected ? '3px solid' : '2px solid transparent',
                            borderColor: isSelected ? 'primary.main' : 'transparent',
                            '&:hover .image-overlay': {
                                borderColor: isSelected ? 'primary.main' : 'primary.light',
                                opacity: 1,
                                boxShadow: 2,
                            },
                        }}
                        onClick={() => setPreviewSrc(src)}
                    >
                        {src && (
                            <Box
                                component="img"
                                src={src}
                                alt={`thumb-${idx}`}
                                sx={{
                                    width: 1,
                                    height: 1,
                                    objectFit: 'cover',
                                    cursor: 'pointer',
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
                                alignItems: 'flex-start',
                                justifyContent: 'flex-end',
                                gap: 1,
                            }}
                            >
                            {/* <Tooltip title="View">
                                <IconButton
                                color="primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleImageClick(idx);
                                }}
                                sx={{ bgcolor: 'background.paper' }}
                                >
                                <Iconify icon="solar:eye-bold" />
                                </IconButton>
                            </Tooltip> */}
                            
                              <Tooltip title="Delete">
                                <IconButton
                                  color="error"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDelete(fileOrUrl);
                                  }}
                                sx={tooltipIconButtonSx}
                                >
                                <Iconify icon="solar:trash-bin-trash-bold" width={15} height={15} />
                                </IconButton>
                              </Tooltip>
                        </Box>
                    </Card>
                  );
                })}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Card>

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
