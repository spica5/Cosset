'use client';

import type { IBlogItem } from 'src/types/blog';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { useGetBlogs } from 'src/actions/blog';
import { useGetGuestArea, updateGuestArea } from 'src/actions/guestarea';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';

// ---------------------------------------------------------------

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

const getTitle = (blog: IBlogItem) => {
  const title = (blog.title || '').trim();
  return title || `Blog #${blog.id}`;
};

export function BlogShareForm() {
  const { user } = useAuthContext();
  const { blogs, blogsLoading } = useGetBlogs(user?.id);
  const { guestarea } = useGetGuestArea(user?.id || '');
  const [showBlogs, setShowBlogs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setShowBlogs(Boolean(guestarea?.blog));
  }, [guestarea?.blog]);

  const currentBlogSetting = Boolean(guestarea?.blog);

  const hasChanges = showBlogs !== currentBlogSetting;

  const handleSave = async () => {
    if (!guestarea) {
      toast.error('Guest area not found');
      return;
    }

    setIsSaving(true);

    try {
      await updateGuestArea({ id: guestarea.id, blog: showBlogs });

      toast.success('Blog sharing settings updated successfully!');
    } catch (error) {
      console.error('Failed to save blog sharing settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save blog sharing settings');
    } finally {
      setIsSaving(false);
    }
  };

  const notFound = !blogs.length && !blogsLoading;

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >

            <Stack direction="row" spacing={5} alignItems="center">
              <Typography variant="h6">Blogs</Typography>

              <Stack direction="row" spacing={2} alignItems="center">
                <Switch
                    checked={showBlogs}
                    onChange={(event) => setShowBlogs(event.target.checked)}
                />
                <Typography variant="body2">Show on Home Space</Typography>
              </Stack>
            </Stack>

            <Button component={RouterLink} href={paths.dashboard.blog.list} size="small" variant="outlined">
              Manage Blogs
            </Button>
        </Stack>

      </Box>

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
              Settings modified
            </Typography>
          )}
        </Stack>
      </Box>
    </Card>
  );
}
