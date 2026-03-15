import type { BoxProps } from '@mui/material/Box';
import type { IBlogItem } from 'src/types/blog';

import { useMemo } from 'react';

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
import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  blogs: IBlogItem[];
  blogsLoading?: boolean;
  viewAllHref?: string;
};

const BLOG_PREVIEW_LIMIT = 3;

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
  sx,
  ...other
}: Props) {
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
          <Stack direction="row" spacing={2} alignItems="center">
            <Iconify icon="solar:document-text-bold" width={36} sx={{ color: 'primary.main' }} />
            <Typography variant="h2">Blogs ({blogs.length})</Typography>
          </Stack>

          {!blogsLoading && blogs.length > 0 && viewAllHref ? (
            <Button
              component={RouterLink}
              href={viewAllHref}
              target="_blank"
              rel="noopener noreferrer"
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
                      <Stack direction="row" alignItems="center" spacing={1}>
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
                    {viewAllHref ? (
                      <Card
                        component={RouterLink}
                        href={viewAllHref}
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
