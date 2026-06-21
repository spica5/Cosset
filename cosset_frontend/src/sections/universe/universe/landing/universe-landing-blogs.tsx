import type { BoxProps } from '@mui/material/Box';
import type { IBlogItem } from 'src/types/blog';

import { useEffect, useMemo, useState } from 'react';

import { useGetViewedBlogIds } from 'src/actions/blog';
import { useGetReactionSummary } from 'src/actions/reaction';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import InputAdornment from '@mui/material/InputAdornment';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import {
  BLOG_CONTENT_FONT_COLOR,
  getBlogContentFontSx,
  isBlogContentFontPreset,
  getBlogContentAppearance,
  getBlogContentBackgroundSx,
  isBlogContentBackgroundPreset,
} from 'src/sections/dashboard/blog/blog-content-style';

import { Iconify } from 'src/components/universe/iconify';

import {
  MySpaceSectionTitle,
} from './myspace-section-title';
import { myspaceItemCardSx, myspaceItemGridSx } from './myspace-item-layout';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  blogs: IBlogItem[];
  blogsLoading?: boolean;
  ownerCustomerId?: string | number;
  isOwner?: boolean;
  getBlogHref?: (blog: IBlogItem) => string;
};

const PAGE_SIZE = 6;

const SECTION_SERIF = '"Georgia", "Times New Roman", "Palatino Linotype", serif';

const CARD_BG = '#FAF6F0';

const ACCENT_PINK = '#E8A0A8';

const formatBlogDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const getPlainContent = (blog: IBlogItem) => {
  const source = (blog.content || blog.description || '').trim();
  if (!source) {
    return 'No content yet.';
  }

  return stripHtml(source);
};

const getExcerpt = (blog: IBlogItem) => {
  const plain = getPlainContent(blog);
  if (plain === 'No content yet.') {
    return plain;
  }

  return plain.length > 72 ? `${plain.slice(0, 72)}...` : plain;
};

type BlogCardProps = {
  blog: IBlogItem;
  blogHref?: string;
  isViewed: boolean;
};

function BlogCardHeart({ blogId }: { blogId: number }) {
  const { reactionSummary } = useGetReactionSummary('blog', blogId);
  const count = reactionSummary?.totalCount ?? 0;

  return (
    <IconButton
      size="small"
      aria-label="Reactions"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      sx={{
        position: 'relative',
        width: 32,
        height: 32,
        bgcolor: ACCENT_PINK,
        color: 'common.white',
        boxShadow: '0 2px 8px rgba(232, 160, 168, 0.45)',
        '&:hover': { bgcolor: '#d88e96' },
      }}
    >
      <Iconify icon="solar:heart-bold" width={16} />
      {count > 0 ? (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            px: 0.5,
            borderRadius: 99,
            bgcolor: 'common.white',
            color: ACCENT_PINK,
            fontSize: 10,
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
            boxShadow: 1,
          }}
        >
          {count}
        </Box>
      ) : null}
    </IconButton>
  );
}

function UniverseLandingBlogCard({ blog, blogHref, isViewed }: BlogCardProps) {
  const fallbackAppearance = getBlogContentAppearance(blog.comments);
  const contentAppearance = {
    fontPreset: isBlogContentFontPreset(blog.fontPreset)
      ? blog.fontPreset
      : fallbackAppearance.fontPreset,
    backgroundPreset: isBlogContentBackgroundPreset(blog.backgroundPreset)
      ? blog.backgroundPreset
      : fallbackAppearance.backgroundPreset,
  };

  const plainContent = getPlainContent(blog);
  const title = (blog.title || '').trim() || `Blog #${blog.id}`;

  const cardBody = (
    <>
      <Box sx={{ position: 'relative', px: 1.5, pt: 1.5 }}>
        <Box
          sx={{
            position: 'relative',
            minHeight: 120,
            borderRadius: 2,
            overflow: 'hidden',
            ...getBlogContentBackgroundSx(contentAppearance.backgroundPreset),
            border: '1px solid rgba(139, 119, 101, 0.14)',
          }}
        >
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <BlogCardHeart blogId={blog.id} />
          </Box>

          {!isViewed ? (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                width: 8,
                height: 10,
                borderRadius: '2px 2px 4px 4px',
                bgcolor: 'error.main',
                zIndex: 1,
              }}
            />
          ) : null}

          <Typography
            variant="body2"
            sx={{
              p: 1.5,
              pr: 5,
              pt: 4,
              color: BLOG_CONTENT_FONT_COLOR,
              ...getBlogContentFontSx(contentAppearance.fontPreset),
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.55,
              minHeight: 112,
            }}
          >
            {plainContent}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={0.75} sx={{ p: 2, pt: 1.5, flex: 1, position: 'relative' }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: SECTION_SERIF,
            fontWeight: 700,
            fontSize: '1.05rem',
            lineHeight: 1.35,
          }}
          noWrap
        >
          {title}
        </Typography>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Iconify icon="solar:calendar-minimalistic-bold" width={14} sx={{ color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            {formatBlogDate(blog.createdAt)}
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
            flex: 1,
          }}
        >
          {getExcerpt(blog)}
        </Typography>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.5 }}>
          {blogHref ? (
            <Typography
              variant="body2"
              sx={{
                color: ACCENT_PINK,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
              }}
            >
              See more
              <Iconify icon="eva:arrow-ios-forward-fill" width={14} />
            </Typography>
          ) : (
            <Box />
          )}

          <Iconify
            icon="solar:flower-bold-duotone"
            width={22}
            sx={{ color: ACCENT_PINK, opacity: 0.75 }}
          />
        </Stack>
      </Stack>
    </>
  );

  const cardSx = {
    height: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 2.5,
    overflow: 'hidden',
    bgcolor: CARD_BG,
    boxShadow: '0 4px 18px rgba(60, 45, 30, 0.08)',
    border: '1px solid rgba(139, 119, 101, 0.12)',
    transition: (theme: import('@mui/material/styles').Theme) =>
      theme.transitions.create(['transform', 'box-shadow'], {
        duration: theme.transitions.duration.shorter,
      }),
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 10px 28px rgba(60, 45, 30, 0.12)',
    },
  };

  if (!blogHref) {
    return (
      <Card sx={cardSx}>
        {cardBody}
      </Card>
    );
  }

  return (
    <Card sx={cardSx}>
      <CardActionArea
        component={RouterLink}
        href={blogHref}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ height: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        {cardBody}
      </CardActionArea>
    </Card>
  );
}

export function UniverseLandingBlogs({
  blogs,
  blogsLoading = false,
  ownerCustomerId,
  isOwner = false,
  getBlogHref,
  sx,
  ...other
}: Props) {
  const { viewedBlogIds } = useGetViewedBlogIds(ownerCustomerId);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const viewedIdSet = useMemo(() => new Set(viewedBlogIds.map(String)), [viewedBlogIds]);

  const sortedBlogs = useMemo(
    () =>
      [...blogs].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [blogs],
  );

  const filteredBlogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sortedBlogs;
    }

    return sortedBlogs.filter((blog) => {
      const searchable = [blog.title, blog.description, blog.content]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [searchQuery, sortedBlogs]);

  const pageCount = Math.max(1, Math.ceil(filteredBlogs.length / PAGE_SIZE));

  const paginatedBlogs = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredBlogs.slice(start, start + PAGE_SIZE);
  }, [filteredBlogs, page, pageCount]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  return (
    <Box
      id="blogs-section"
      component="section"
      sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, ...sx }}
      {...other}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
        >
          <Stack spacing={1} sx={{ maxWidth: 520 }}>
            <MySpaceSectionTitle
              title="BLOGS"
              subtitle="A place for thoughts, feelings, and everyday stories."
              itemCount={sortedBlogs.length}
            />
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: 1, md: 'auto' } }}
          >
            <TextField
              size="small"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              sx={{
                minWidth: { sm: 240 },
                bgcolor: 'background.paper',
                borderRadius: 99,
                '& .MuiOutlinedInput-root': { borderRadius: 99 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            {isOwner ? (
              <Button
                component={RouterLink}
                href={paths.dashboard.blog.new}
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                sx={{
                  borderRadius: 99,
                  px: 2.5,
                  whiteSpace: 'nowrap',
                  bgcolor: ACCENT_PINK,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#d88e96', boxShadow: 'none' },
                }}
              >
                New Post
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {blogsLoading ? (
          <Typography color="text.secondary">Loading blogs...</Typography>
        ) : filteredBlogs.length === 0 ? (
          <Typography color="text.secondary">
            {searchQuery.trim() ? 'No blog posts match your search.' : 'No shared blog posts found.'}
          </Typography>
        ) : (
          <>
            <Box sx={myspaceItemGridSx}>
              {paginatedBlogs.map((blog) => (
                <Box key={blog.id} sx={myspaceItemCardSx}>
                  <UniverseLandingBlogCard
                    blog={blog}
                    blogHref={getBlogHref?.(blog)}
                    isViewed={viewedIdSet.has(String(blog.id))}
                  />
                </Box>
              ))}
            </Box>

            {pageCount > 1 ? (
              <Stack alignItems="center" sx={{ pt: 1 }}>
                <Pagination
                  count={pageCount}
                  page={Math.min(page, pageCount)}
                  onChange={(_, value) => setPage(value)}
                  shape="rounded"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 600,
                    },
                    '& .Mui-selected': {
                      bgcolor: `${ACCENT_PINK} !important`,
                      color: 'common.white',
                    },
                  }}
                />
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </Box>
  );
}
