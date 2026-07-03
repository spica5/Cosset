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

import { AlbumImageUpload } from './album-image-upload';
import { AlbumImageGallery } from './album-image-gallery';

// ----------------------------------------------------------------------

type Props = {
  album?: IAlbumItem;
};

export function AlbumDetailsContent({ album }: Props) {
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);

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

  const handleGalleryRefresh = useCallback(() => {
    setGalleryRefreshKey((prev) => prev + 1);
  }, []);

  const handleDelete = async (imageId: number) => {
    try {
      await axiosInstance.delete(endpoints.album.images.delete(album!.id, String(imageId)));
      setOpenDeleteDialog(false);
      setImageToDelete(null);
      handleGalleryRefresh();
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
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
      

      {album?.id && (
        <AlbumImageGallery
          albumId={String(album.id)}
          refreshKey={galleryRefreshKey}
          onRefresh={handleGalleryRefresh}
        />
      )}
    </>
  );

  const renderHead = (
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
              handleGalleryRefresh();
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
