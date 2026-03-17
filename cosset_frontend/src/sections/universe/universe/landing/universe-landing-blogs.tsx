import type { BoxProps } from '@mui/material/Box';
import type { IBlogItem } from 'src/types/blog';

import { useMemo } from 'react';

import { useGetViewedBlogIds } from 'src/actions/blog';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';
import {
  getBlogContentAppearance,
  getBlogContentBackgroundSx,
  getBlogContentFontSx,
  isBlogContentBackgroundPreset,
  isBlogContentFontPreset,
} from 'src/sections/dashboard/blog/blog-content-style';

import { Label } from 'src/components/universe/label';
import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  blogs: IBlogItem[];
  blogsLoading?: boolean;
  viewAllHref?: string;
  ownerCustomerId?: string | number;
  getBlogHref?: (blog: IBlogItem) => string;
};

const BLOG_PREVIEW_LIMIT = 3;
const SECTION_TITLE_FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

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

const getSummary = (blog: IBlogItem) => {
  const source = (blog.description || blog.content || '').trim();
  if (!source) {
    return 'No description yet.';
  }

  return source.length > 160 ? `${source.slice(0, 160)}...` : source;
};

export function UniverseLandingBlogs({
  blogs,
  blogsLoading = false,
  viewAllHref,
  ownerCustomerId,
  getBlogHref,
  sx,
  ...other
}: Props) {
  const { viewedBlogIds } = useGetViewedBlogIds(ownerCustomerId);

  const viewedIdSet = useMemo(() => new Set(viewedBlogIds.map(String)), [viewedBlogIds]);

  const totalCount = blogs.length;
  const viewedCount = useMemo(
    () => blogs.filter((blog) => viewedIdSet.has(String(blog.id))).length,
    [blogs, viewedIdSet],
  );
  const unreadCount = totalCount - viewedCount;

  const previewBlogs = useMemo(
    () =>
      [...blogs]
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          return bTime - aTime;
        })
        .slice(0, BLOG_PREVIEW_LIMIT),
    [blogs],
  );

  return (
    <Card
      id="blogs-section"
      component="section"
      sx={{ pb: 4, overflow: 'hidden', pt: { xs: 3, md: 6 }, ...sx }}
      {...other}
    >
      <Container>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack spacing={0.75}>
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                px: 1.5,
                py: 0.8,
                borderRadius: 99,
                border: '1px solid rgba(18, 96, 194, 0.32)',
                background: 'linear-gradient(90deg, rgba(35, 126, 233, 0.16), rgba(35, 126, 233, 0.05))',
                boxShadow: '0 8px 18px rgba(35, 126, 233, 0.14)',
                width: 'fit-content',
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(35, 126, 233, 0.35)',
                  bgcolor: 'rgba(255,255,255,0.35)',
                }}
              >
                <Iconify icon="solar:document-text-bold" width={24} sx={{ color: 'primary.main' }} />
              </Box>

              <Typography
                variant="h2"
                sx={{
                  fontFamily: SECTION_TITLE_FONT,
                  fontWeight: 800,
                  letterSpacing: '0.01em',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                >
                  Blogs
                  {unreadCount > 0 ? (
                    <Label
                      color="error"
                      variant="filled"
                      sx={{
                        top: 0,
                        left: '100%',
                        px: 0.5,
                        height: 24,
                        position: 'absolute',
                        transform: 'translate(-10%, -45%)',
                        borderRadius: '50%',
                      }}
                    >
                      {unreadCount}
                    </Label>
                  ) : viewedCount > 0 ? (
                    <Label
                      color="success"
                      variant="filled"
                      sx={{
                        top: 0,
                        left: '100%',
                        px: 0.5,
                        height: 24,
                        position: 'absolute',
                        transform: 'translate(-10%, -45%)',
                        borderRadius: '50%',
                      }}
                    >
                      {viewedCount}
                    </Label>
                  ) : null}
                </Box>
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', fontFamily: SECTION_TITLE_FONT, letterSpacing: '0.01em' }}
              >
                Shared stories and reflections from this universe
              </Typography>

              {totalCount > 0 && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Label color="success" variant="soft" sx={{ fontSize: 11 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Iconify icon="eva:eye-fill" width={12} />
                      <Box component="span">{viewedCount} viewed</Box>
                    </Stack>
                  </Label>
                  {unreadCount > 0 && (
                    <Label color="warning" variant="soft" sx={{ fontSize: 11 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify icon="eva:eye-off-fill" width={12} />
                        <Box component="span">{unreadCount} unread</Box>
                      </Stack>
                    </Label>
                  )}
                </Stack>
              )}
            </Stack>
          </Stack>

          {!blogsLoading && blogs.length > 0 && viewAllHref ? (
            <Button
              component={RouterLink}
              href={viewAllHref}
              size="small"
              variant="outlined"
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={14} />}
            >
              View all shared blogs
            </Button>
          ) : null}
        </Stack>

        <Box sx={{ py: { xs: 4, md: 6 } }}>
          {blogsLoading ? (
            <Typography color="text.secondary">Loading blogs...</Typography>
          ) : blogs.length === 0 ? (
            <Typography color="text.secondary">No shared blog posts found.</Typography>
          ) : (
            <Grid container spacing={2}>
              {previewBlogs.map((blog) => {
                const fallbackAppearance = getBlogContentAppearance(blog.comments);
                const blogHref = getBlogHref?.(blog);
                const isViewed = viewedIdSet.has(String(blog.id));
                const contentAppearance = {
                  fontPreset: isBlogContentFontPreset(blog.fontPreset)
                    ? blog.fontPreset
                    : fallbackAppearance.fontPreset,
                  backgroundPreset: isBlogContentBackgroundPreset(blog.backgroundPreset)
                    ? blog.backgroundPreset
                    : fallbackAppearance.backgroundPreset,
                };

                const cardContent = (
                  <CardContent
                    sx={{
                      ...getBlogContentBackgroundSx(contentAppearance.backgroundPreset),
                      minHeight: 180,
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography
                          variant="h6"
                          noWrap
                          sx={{
                            color: '#3c2a1a',
                            fontFamily: 'Georgia, "Times New Roman", serif',
                          }}
                        >
                          {(blog.title || '').trim() || `Blog #${blog.id}`}
                        </Typography>

                        <Label
                          color={isViewed ? 'success' : 'warning'}
                          variant="soft"
                          title={isViewed ? 'Viewed' : 'Unread'}
                          sx={{
                            minWidth: 28,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify icon={isViewed ? 'eva:eye-fill' : 'eva:eye-off-fill'} width={18} />
                        </Label>
                      </Stack>

                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Iconify icon="eva:clock-outline" width={14} sx={{ color: 'warning.main' }} />
                        <Typography variant="caption" color="text.secondary">
                          Created: {formatDate(blog.createdAt)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={0.75} alignItems="flex-start">
                        <Iconify
                          icon="solar:notes-linear"
                          width={14}
                          sx={{ color: 'info.main', mt: '2px', flexShrink: 0 }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#3c2a1a',
                            ...getBlogContentFontSx(contentAppearance.fontPreset),
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {getSummary(blog)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                );

                return (
                  <Grid item xs={12} sm={6} md={4} key={blog.id}>
                    {blogHref ? (
                      <Card
                        component={RouterLink}
                        href={blogHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          height: 1,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          border: '0px solid',
                          borderColor: 'divider',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: (theme) =>
                            theme.transitions.create(['transform', 'box-shadow'], {
                              duration: theme.transitions.duration.shorter,
                            }),
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            borderColor: 'primary.main',
                            boxShadow: (theme) => theme.shadows[8],
                          },
                        }}
                      >
                        {cardContent}
                      </Card>
                    ) : (
                      <Card
                        sx={{
                          height: 1,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {cardContent}
                      </Card>
                    )}
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Container>
    </Card>
  );
}
