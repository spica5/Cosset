'use client';

import type { IBlogItem } from 'src/types/blog';

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
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { useGetBlogs, updateBlog } from 'src/actions/blog';
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

type BlogVisibility = 0 | 1;
type BlogIdKey = string;

const toBlogIdKey = (id: string | number): BlogIdKey => String(id);

const isPublicBlog = (isPublic: unknown): boolean => {
  if (typeof isPublic === 'number') {
    return isPublic === 1;
  }

  if (typeof isPublic === 'string') {
    const normalized = isPublic.trim().toLowerCase();
    return normalized === '1' || normalized === 'public' || normalized === 'true';
  }

  if (typeof isPublic === 'boolean') {
    return isPublic;
  }

  return false;
};

export function BlogShareForm() {
  const { user } = useAuthContext();
  const { blogs, blogsLoading, refreshBlogs } = useGetBlogs(user?.id);
  const { guestarea } = useGetGuestArea(user?.id || '');
  const [showBlogs, setShowBlogs] = useState(false);
  const [blogUpdates, setBlogUpdates] = useState<Record<BlogIdKey, BlogVisibility>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setShowBlogs(Boolean(guestarea?.blog));
  }, [guestarea?.blog]);

  const currentBlogSetting = Boolean(guestarea?.blog);

  const hasVisibilityChanges = Object.keys(blogUpdates).length > 0;
  const hasGuestAreaChange = showBlogs !== currentBlogSetting;
  const hasChanges = hasVisibilityChanges || hasGuestAreaChange;

  const handleBulkVisibility = (nextVisibility: BlogVisibility) => {
    const next: Record<BlogIdKey, BlogVisibility> = {};
    blogs.forEach((blog) => {
      next[toBlogIdKey(blog.id)] = nextVisibility;
    });
    setBlogUpdates(next);
  };

  const handleVisibilityChange = (blogId: string | number, nextVisibility: BlogVisibility) => {
    const blogIdKey = toBlogIdKey(blogId);
    const originalBlog = blogs.find((blog) => toBlogIdKey(blog.id) === blogIdKey);
    const originalVisibility: BlogVisibility = isPublicBlog(originalBlog?.isPublic) ? 1 : 0;

    setBlogUpdates((prev) => {
      if (nextVisibility === originalVisibility) {
        const next = { ...prev };
        delete next[blogIdKey];
        return next;
      }

      return {
        ...prev,
        [blogIdKey]: nextVisibility,
      };
    });
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.warning('No changes to save');
      return;
    }

    if (hasGuestAreaChange && !guestarea) {
      toast.error('Guest area not found');
      return;
    }

    setIsSaving(true);

    try {
      if (hasGuestAreaChange && guestarea) {
        await updateGuestArea({ id: guestarea.id, blog: showBlogs });
      }

      const visibilityUpdates = Object.entries(blogUpdates);

      if (visibilityUpdates.length > 0) {
        await Promise.all(
          visibilityUpdates.map(async ([blogId, isPublic]) => {
            const matchedBlog = blogs.find((blog) => toBlogIdKey(blog.id) === blogId);

            await updateBlog(blogId, {
              isPublic,
              customerId: matchedBlog?.customerId ?? (user?.id ? String(user.id) : undefined),
            });
          })
        );

        await refreshBlogs();
        setBlogUpdates({});
      }

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

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Typography variant="h6">Blogs</Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <Switch
                checked={showBlogs}
                onChange={(event) => setShowBlogs(event.target.checked)}
              />
              <Typography variant="body2">Show on Home Space</Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" variant="outlined" color="success" onClick={() => handleBulkVisibility(1)} disabled={isSaving || !blogs.length}>
              Enable All
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleBulkVisibility(0)} disabled={isSaving || !blogs.length}>
              Disable All
            </Button>
            <Button component={RouterLink} href={paths.dashboard.blog.list} size="small" variant="outlined">
              Manage Blogs
            </Button>
          </Stack>
        </Stack>

        {blogsLoading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : notFound ? (
          <EmptyContent filled />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Public</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Views</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {blogs.map((blog) => {
                  const blogIdKey = toBlogIdKey(blog.id);
                  const ownerCustomerId = String(blog.customerId || user?.id || '').trim();
                  const hasOwnerCustomerId = ownerCustomerId !== '';

                  return (
                    <TableRow key={blog.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {blog.id}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Switch
                          checked={
                            blogUpdates[blogIdKey] !== undefined
                              ? blogUpdates[blogIdKey] === 1
                              : isPublicBlog(blog.isPublic)
                          }
                          onChange={(event) =>
                            handleVisibilityChange(blog.id, event.target.checked ? 1 : 0)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {getTitle(blog)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{blog.description || '-'}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{formatDate(blog.createdAt)}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{blog.totalViews || 0}</Typography>
                      </TableCell>

                      <TableCell>
                        {hasOwnerCustomerId ? (
                          <Link
                            href={paths.universe.blog(ownerCustomerId, blog.id)}
                            target="_blank"
                            rel="noopener"
                          >
                            <Typography
                              variant="body2"
                              sx={{ color: 'primary.main', cursor: 'pointer' }}
                            >
                              View
                            </Typography>
                          </Link>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      </Box>

      <Box sx={{ p: 3, pt: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            startIcon={isSaving && <CircularProgress size={20} />}
            fullWidth={false}
            sx={{ width: { xs: 1, sm: 'auto' } }}
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
