'use client';

import type { IBlogItem } from 'src/types/blog';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useGetReactionSummary } from 'src/actions/reaction';
import {
  getBlogCategoryLabel,
} from 'src/sections/dashboard/blog/blog-categories';
import {
  getBlogContentAppearance,
  getBlogContentBackgroundSx,
  getBlogContentFontSx,
  isBlogContentBackgroundPreset,
  isBlogContentFontPreset,
} from 'src/sections/dashboard/blog/blog-content-style';

import { stylesMode } from 'src/theme/dashboard/styles';

import { Label } from 'src/components/dashboard/label';
import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

const CONTENT_PREVIEW_LENGTH = 100;
const TITLE_PREVIEW_LENGTH = 80;

const formatDate = (value: unknown) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
};

const getContent = (blog: IBlogItem) => {
  const source = blog.content || '';
  const text = source.trim();

  if (!text) {
    return 'No content yet.';
  }

  return text;
};

const getTitle = (blog: IBlogItem) => {
  const title = (blog.title || `Untitled Post #${blog.id}`).trim();

  if (title.length <= TITLE_PREVIEW_LENGTH) {
    return title;
  }

  return `${title.slice(0, TITLE_PREVIEW_LENGTH)}...`;
};

const getContentLineCount = (content: string) => content.split(/\r?\n/).length;

const getTotalReactionCount = (counts?: Partial<Record<string, number>>): number => {
  if (!counts) return 0;
  return (Object.values(counts) as number[]).reduce((sum: number, count: number | undefined) => sum + (count ?? 0), 0);
};

// ----------------------------------------------------------------------

export type BlogListItemProps = {
  blog: IBlogItem;
  isExpanded: boolean;
  canExpand: boolean;
  onToggleContent: (blogId: string | number, canToggle: boolean) => void;
  onDelete: (blog: IBlogItem) => void;
};

export function BlogListItem({ blog, isExpanded, canExpand, onToggleContent, onDelete }: BlogListItemProps) {
  const { reactionSummary } = useGetReactionSummary('blog', String(blog.id), undefined);
  const totalReactionCount = getTotalReactionCount(reactionSummary?.counts);

  const content = getContent(blog);
  const fallbackAppearance = getBlogContentAppearance(blog.comments);
  const contentAppearance = {
    fontPreset: isBlogContentFontPreset(blog.fontPreset)
      ? blog.fontPreset
      : fallbackAppearance.fontPreset,
    backgroundPreset: isBlogContentBackgroundPreset(blog.backgroundPreset)
      ? blog.backgroundPreset
      : fallbackAppearance.backgroundPreset,
  };
  const fullTitle = (blog.title || `Untitled Post #${blog.id}`).trim();
  const title = getTitle(blog);
  const hasMoreThanPreview =
    content !== 'No content yet.' && !!(canExpand || getContentLineCount(content) > 2 || content.length > CONTENT_PREVIEW_LENGTH);

  return (
    <Card sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          useFlexGap
          flexWrap="wrap"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Label variant="soft" color={blog.isPublic === 1 ? 'info' : 'default'}>
              {blog.isPublic === 1 ? 'Public' : 'Private'}
            </Label>

            <Typography variant="h6" title={fullTitle}>
              {title}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {getBlogCategoryLabel(blog.category)}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2} useFlexGap flexWrap="wrap">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify width={16} icon="eva:eye-fill" sx={{ color: 'info.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Views {blog.totalViews ?? 0}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify width={16} icon="mdi:heart" sx={{ color: 'error.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Reactions {totalReactionCount}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify width={16} icon="eva:clock-outline" sx={{ color: 'warning.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatDate(blog.createdAt)}
            </Typography>
          </Stack>
        </Stack>

        <Divider />

        <Box
          sx={{
            p: { xs: 1.5, md: 2 },
            borderRadius: 1.5,
            border: '1px solid',
            ...getBlogContentBackgroundSx(contentAppearance.backgroundPreset),
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#3c2a1a',
              [stylesMode.dark]: { color: '#e8d5c0' },
              ...getBlogContentFontSx(contentAppearance.fontPreset),
              textIndent: '0.25em',
              whiteSpace: isExpanded ? 'pre-wrap' : 'pre-line',
              ...(isExpanded
                ? null
                : {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }),
            }}
          >
            {content}
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={
              <Iconify icon={isExpanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'} />
            }
            disabled={!hasMoreThanPreview}
            onClick={() => onToggleContent(blog.id, hasMoreThanPreview)}
          >
            {isExpanded ? 'Collapse Content' : 'Expand Content'}
          </Button>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              component={RouterLink}
              href={paths.dashboard.blog.edit(blog.id)}
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="eva:edit-fill" />}
            >
              Edit
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Iconify icon="eva:trash-2-outline" />}
              onClick={() => onDelete(blog)}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
