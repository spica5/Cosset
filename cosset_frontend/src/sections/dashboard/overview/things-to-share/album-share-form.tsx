'use client';

import { mutate } from 'swr';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import axiosInstance, { endpoints } from 'src/utils/axios';
import { updateAlbum, useGetAlbums } from 'src/actions/album';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';

// ---------------------------------------------------------------

type AlbumShareFormProps = {
  onSaveSuccess?: () => void;
};

export function AlbumShareForm({ onSaveSuccess }: AlbumShareFormProps) {
  const { albums, albumsLoading } = useGetAlbums();
  const [albumUpdates, setAlbumUpdates] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [coverUrlMap, setCoverUrlMap] = useState<Record<number, string>>({});
  const [loadingCovers, setLoadingCovers] = useState(false);

  // Load S3 URLs for album cover images
  useEffect(() => {
    let mounted = true;

    const loadCoverUrls = async () => {
      if (albums.length === 0) {
        setCoverUrlMap({});
        return;
      }

      setLoadingCovers(true);
      const map: Record<number, string> = {};

      try {
        const coverPromises = albums
          .filter((album) => album.coverUrl)
          .map(async (album) => {
            try {
              const res = await axiosInstance.get(endpoints.upload.image, {
                params: { key: album.coverUrl },
              });
              return { albumId: album.id, url: (res.data?.url as string) || '' };
            } catch (error) {
              console.error('Failed to fetch cover URL for album', album.id, error);
              return { albumId: album.id, url: '' };
            }
          });

        const results = await Promise.all(coverPromises);

        if (mounted) {
          results.forEach(({ albumId, url }) => {
            if (url) {
              map[albumId] = url;
            }
          });
          setCoverUrlMap(map);
        }
      } catch (error) {
        console.error('Failed to load cover URLs:', error);
      } finally {
        if (mounted) {
          setLoadingCovers(false);
        }
      }
    };

    loadCoverUrls();

    return () => {
      mounted = false;
    };
  }, [albums]);

  const handleOpenessChange = (albumId: number, newOpenness: string) => {
    setAlbumUpdates((prev) => ({
      ...prev,
      [albumId]: newOpenness,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updates = Object.entries(albumUpdates);
      
      if (updates.length === 0) {
        toast.warning('No changes to save');
        return;
      }

      await Promise.all(
        updates.map(async ([albumId, newOpenness]) => {
          const id = Number(albumId); // string->number conversion
          const album = albums.find((a) => a.id === id);

          if (album) {
            await updateAlbum(parseInt(albumId, 10), {
              ...album,
              openness: newOpenness as any,
            });
          }
        })
      );

      // Refresh albums list from server so UI shows updated openness
      await mutate(endpoints.album.list);
      setAlbumUpdates({});
      toast.success('Albums updated successfully!');
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error('Failed to save albums:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save albums');
    } finally {
      setIsSaving(false);
    }
  };

  const notFound = !albums.length && !albumsLoading;
  const hasChanges = Object.keys(albumUpdates).length > 0;

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Albums
        </Typography>
        {notFound ? (
          <EmptyContent filled />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Public</TableCell>

                  <TableCell>Cover Image</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Description</TableCell>
                  
                  <TableCell>Views</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {albums.map((album) => (
                  <TableRow key={album.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {album.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={albumUpdates[album.id] !== undefined ? albumUpdates[album.id] === 'Public' : album.openness === 'Public'}
                        onChange={(e) =>
                          handleOpenessChange(album.id, e.target.checked ? 'Public' : 'Private')
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {album.coverUrl && coverUrlMap[album.id] && (
                        <Box
                          component="img"
                          src={coverUrlMap[album.id]}
                          alt={album.title}
                          sx={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 1 }}
                        />
                      )}
                      {album.coverUrl && !coverUrlMap[album.id] && loadingCovers && (
                        <Box sx={{ width: 80, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress size={24} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {album.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{album.description}</Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">{album.totalViews || 0}</Typography>
                    </TableCell>
                    <TableCell>
                      <Link href={paths.universe.album(album.id)} target="_blank" rel="noopener">
                        <Typography variant="body2" sx={{ color: 'primary.main', cursor: 'pointer' }}>
                          View
                        </Typography>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {albums.length > 0 && (
        <Box sx={{ p: 3, pt: 0 }}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              startIcon={isSaving && <CircularProgress size={20} />}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            {hasChanges && (
              <Typography variant="body2" sx={{ color: 'warning.main', alignSelf: 'center' }}>
                {Object.keys(albumUpdates).length} album(s) modified
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Card>
  );
}
