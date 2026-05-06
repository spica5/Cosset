'use client';

import type { IBlogItem } from 'src/types/blog';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TextSnippetRoundedIcon from '@mui/icons-material/TextSnippetRounded';
import InsertEmoticonRoundedIcon from '@mui/icons-material/InsertEmoticonRounded';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { GLOBAL_EMOTICON_OPTIONS } from 'src/constants/emoticons';

import { useAuthContext } from 'src/auth/hooks';

import { createBlog, updateBlog, useGetBlog } from 'src/actions/blog';
import { stylesMode } from 'src/theme/dashboard/styles';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { BLOG_CATEGORY_OPTIONS } from 'src/sections/dashboard/blog/blog-categories';
import {
  BLOG_CONTENT_BACKGROUND_OPTIONS,
  BLOG_CONTENT_FONT_COLOR,
  BLOG_CONTENT_FONT_OPTIONS,
  DEFAULT_BLOG_CONTENT_APPEARANCE,
  getBlogContentAppearance,
  getBlogContentBackgroundSx,
  getBlogContentFontSx,
  isBlogContentBackgroundPreset,
  isBlogContentFontPreset,
  type BlogContentBackgroundPreset,
  type BlogContentFontPreset,
} from 'src/sections/dashboard/blog/blog-content-style';

import { toast } from 'src/components/dashboard/snackbar';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

// ----------------------------------------------------------------------

type Props = {
  blogId?: string | number;
};

// ----------------------------------------------------------------------

type BlogFormValues = {
  title: string;
  category: number;
  description: string;
  content: string;
  file: string;
  isPublic: number;
  totalViews: number;
  following: number;
  comments: string;
  fontPreset: BlogContentFontPreset;
  backgroundPreset: BlogContentBackgroundPreset;
};

const defaultValues: BlogFormValues = {
  title: '',
  category: 1,
  description: '',
  content: '',
  file: '',
  isPublic: 1,
  totalViews: 0,
  following: 0,
  comments: '',
  fontPreset: DEFAULT_BLOG_CONTENT_APPEARANCE.fontPreset,
  backgroundPreset: DEFAULT_BLOG_CONTENT_APPEARANCE.backgroundPreset,
};

const BLOG_TEMPLATE_OPTIONS = [
  {
    label: 'Greeting',
    value: 'Hello everyone,\n\nI hope you are doing well today.\n\n',
  },
  {
    label: 'Warm Welcome',
    value: 'Hi everyone,\n\nWelcome to this new post.\n\n',
  },
  {
    label: 'Closing',
    value: 'Thank you for reading.\n\nBest regards,\n',
  },
  {
    label: 'Daily Update',
    value: 'Hello everyone,\n\nHere is a quick update for today.\n\n',
  },
  {
    label: 'Announcement',
    value: 'Hi everyone,\n\nI am excited to share an announcement with you.\n\n',
  },
  {
    label: 'Motivation',
    value: 'Hello everyone,\n\nKeep going and never give up. Every step forward matters.\n\n',
  },
  {
    label: 'Appreciation',
    value: 'Hi everyone,\n\nI just want to say thank you for your support and kindness.\n\n',
  },
  {
    label: 'Event Invitation',
    value: 'Hello everyone,\n\nYou are warmly invited to join this special event.\n\n',
  },
  {
    label: 'Story Intro',
    value: 'Hi everyone,\n\nToday I want to share a short story with you.\n\n',
  },
  {
    label: 'Question Post',
    value: 'Hello everyone,\n\nI would love to hear your thoughts on this topic.\n\n',
  },
  {
    label: 'Celebration',
    value: 'Hi everyone,\n\nLet us celebrate this wonderful moment together.\n\n',
  },
  {
    label: 'Friendly Reminder',
    value: 'Hello everyone,\n\nJust a friendly reminder about the following.\n\n',
  },
] as const;

export function BlogCreateView({ blogId }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();

  const isEditMode = Boolean(blogId);
  const { blog, blogLoading } = useGetBlog(isEditMode ? blogId! : '');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BlogFormValues>({ defaultValues });

  const contentField = register('content');
  const contentInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const selectedFontPreset = watch('fontPreset');
  const selectedBackgroundPreset = watch('backgroundPreset');
  const contentPreview = watch('content');
  const [emoticonAnchorEl, setEmoticonAnchorEl] = useState<HTMLElement | null>(null);
  const [templateAnchorEl, setTemplateAnchorEl] = useState<HTMLElement | null>(null);
  const emoticonCloseTimerRef = useRef<number | null>(null);
  const templateCloseTimerRef = useRef<number | null>(null);

  const currentUserId = String(user?.id || '');
  const ownerId = String(blog?.customerId || '');
  const isOwner = !isEditMode || !blog ? true : !!currentUserId && ownerId === currentUserId;
  const isReadOnly = isEditMode && !isOwner;

  const clearEmoticonCloseTimer = useCallback(() => {
    if (emoticonCloseTimerRef.current !== null) {
      window.clearTimeout(emoticonCloseTimerRef.current);
      emoticonCloseTimerRef.current = null;
    }
  }, []);

  const clearTemplateCloseTimer = useCallback(() => {
    if (templateCloseTimerRef.current !== null) {
      window.clearTimeout(templateCloseTimerRef.current);
      templateCloseTimerRef.current = null;
    }
  }, []);

  const scheduleCloseEmoticonPopover = useCallback(() => {
    clearEmoticonCloseTimer();
    emoticonCloseTimerRef.current = window.setTimeout(() => {
      setEmoticonAnchorEl(null);
    }, 260);
  }, [clearEmoticonCloseTimer]);

  const scheduleCloseTemplatePopover = useCallback(() => {
    clearTemplateCloseTimer();
    templateCloseTimerRef.current = window.setTimeout(() => {
      setTemplateAnchorEl(null);
    }, 260);
  }, [clearTemplateCloseTimer]);

  const openEmoticonPopover = useCallback(
    (anchor: HTMLElement) => {
      clearEmoticonCloseTimer();
      setTemplateAnchorEl(null);
      setEmoticonAnchorEl(anchor);
    },
    [clearEmoticonCloseTimer],
  );

  const openTemplatePopover = useCallback(
    (anchor: HTMLElement) => {
      clearTemplateCloseTimer();
      setEmoticonAnchorEl(null);
      setTemplateAnchorEl(anchor);
    },
    [clearTemplateCloseTimer],
  );

  const insertTextIntoContent = useCallback(
    (text: string, appendSeparator: string) => {
      if (isReadOnly || !text) {
        return;
      }

      const input = contentInputRef.current;
      const currentValue = getValues('content') || '';

      if (!input) {
        const appended = `${currentValue}${currentValue ? appendSeparator : ''}${text}`;
        setValue('content', appended, { shouldDirty: true, shouldTouch: true });
        return;
      }

      const selectionStart = input.selectionStart ?? currentValue.length;
      const selectionEnd = input.selectionEnd ?? selectionStart;
      const nextValue = `${currentValue.slice(0, selectionStart)}${text}${currentValue.slice(selectionEnd)}`;
      const nextCaretPosition = selectionStart + text.length;

      setValue('content', nextValue, { shouldDirty: true, shouldTouch: true });
      setEmoticonAnchorEl(null);
      setTemplateAnchorEl(null);

      window.requestAnimationFrame(() => {
        const target = contentInputRef.current;

        if (!target) {
          return;
        }

        target.focus();
        target.setSelectionRange(nextCaretPosition, nextCaretPosition);
      });
    },
    [getValues, isReadOnly, setValue],
  );

  const handleInsertEmoticon = useCallback(
    (emoticon: string) => {
      insertTextIntoContent(emoticon, ' ');
    },
    [insertTextIntoContent],
  );

  const handleInsertTemplate = useCallback(
    (template: string) => {
      insertTextIntoContent(template, '\n\n');
    },
    [insertTextIntoContent],
  );

  useEffect(
    () => () => {
      clearEmoticonCloseTimer();
      clearTemplateCloseTimer();
    },
    [clearEmoticonCloseTimer, clearTemplateCloseTimer],
  );

  useEffect(() => {
    if (!isEditMode || !blog) {
      return;
    }

    const fallbackAppearance = getBlogContentAppearance(blog.comments);
    const appearance = {
      fontPreset: isBlogContentFontPreset(blog.fontPreset)
        ? blog.fontPreset
        : fallbackAppearance.fontPreset,
      backgroundPreset: isBlogContentBackgroundPreset(blog.backgroundPreset)
        ? blog.backgroundPreset
        : fallbackAppearance.backgroundPreset,
    };

    reset({
      title: blog.title || '',
      category: blog.category ?? 1,
      description: blog.description || '',
      content: blog.content || '',
      file: blog.file || '',
      isPublic: blog.isPublic ?? 1,
      totalViews: blog.totalViews ?? 0,
      following: blog.following ?? 0,
      comments: blog.comments || '',
      fontPreset: appearance.fontPreset,
      backgroundPreset: appearance.backgroundPreset,
    });
  }, [blog, isEditMode, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        if (!blog) {
          toast.error('Blog post not found.');
          return;
        }

        if (!isOwner) {
          toast.error('You can only edit your own blog post.');
          return;
        }

        await updateBlog(blogId!, {
          customerId: blog.customerId || user?.id || null,
          title: values.title.trim(),
          category: values.category,
          description: values.description.trim() || null,
          content: values.content.trim() || null,
          file: values.file.trim() || null,
          isPublic: values.isPublic,
          totalViews: values.totalViews,
          following: values.following,
          fontPreset: values.fontPreset,
          backgroundPreset: values.backgroundPreset,
          comments: values.comments.trim() || null,
        });

        toast.success('Blog post updated successfully.');
        router.refresh();
        return;
      }

      const payload: Omit<IBlogItem, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: user?.id || null,
        title: values.title.trim(),
        category: values.category,
        description: values.description.trim() || null,
        content: values.content.trim() || null,
        file: values.file.trim() || null,
        isPublic: values.isPublic,
        totalViews: values.totalViews,
        following: values.following,
        fontPreset: values.fontPreset,
        backgroundPreset: values.backgroundPreset,
        comments: values.comments.trim() || null,
      };

      await createBlog(payload);

      toast.success('Blog post created successfully.');
      router.push(paths.dashboard.blog.list);
    } catch (error) {
      console.error(error);
      toast.error(isEditMode ? 'Failed to update blog post.' : 'Failed to create blog post.');
    }
  });

  if (isEditMode && blogLoading) {
    return (
      <DashboardContent>
        <Card sx={{ p: 3 }}>Loading...</Card>
      </DashboardContent>
    );
  }

  if (isEditMode && !blog) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Blog Post"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Blogs', href: paths.dashboard.blog.list },
            { name: 'Edit' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card sx={{ p: 3 }}>Blog post not found.</Card>
      </DashboardContent>
    );
  }

  const heading = isEditMode ? 'Edit Blog' : 'Create New Blog';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Blogs', href: paths.dashboard.blog.list },
          { name: isEditMode ? 'Edit Blog' : 'Create New Blog' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3 }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <TextField
            label="Title"
            placeholder="Enter blog title"
            InputLabelProps={{ shrink: true }}
            {...register('title', { required: 'Title is required' })}
            error={!!errors.title}
            helperText={errors.title?.message}
            disabled={isReadOnly}
          />          

          <Stack direction={{ xs: 'column', md: 'row' }} 
            spacing={2} 
            sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
          >
            <TextField
              select
              label="Category"
              InputLabelProps={{ shrink: true }}
              defaultValue={defaultValues.category}
              {...register('category', { valueAsNumber: true })}
              disabled={isReadOnly}
            >
              {BLOG_CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Visibility"
              InputLabelProps={{ shrink: true }}
              defaultValue={defaultValues.isPublic}
              {...register('isPublic', { valueAsNumber: true })}
              sx={{ minWidth: 200 }}
              disabled={isReadOnly}
            >
              <MenuItem value={1}>Public</MenuItem>
              <MenuItem value={0}>Private</MenuItem>
            </TextField>

            <TextField
              select
              label="Content Font"
              InputLabelProps={{ shrink: true }}
              defaultValue={defaultValues.fontPreset}
              {...register('fontPreset')}
              disabled={isReadOnly}
            >
              {BLOG_CONTENT_FONT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Content Background"
              InputLabelProps={{ shrink: true }}
              defaultValue={defaultValues.backgroundPreset}
              {...register('backgroundPreset')}
              disabled={isReadOnly}
            >
              {BLOG_CONTENT_BACKGROUND_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Description"
            placeholder="Short description"
            multiline
            minRows={2}
            InputLabelProps={{ shrink: true }}
            {...register('description')}
            disabled={isReadOnly}
          />

          <Stack spacing={1}>
            <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Insert emoticons or templates
              </Typography>

              <IconButton
                type="button"
                size="small"
                color="primary"
                aria-label="Insert emoticon"
                disabled={isReadOnly}
                onClick={(event) => openEmoticonPopover(event.currentTarget)}
              >
                <InsertEmoticonRoundedIcon fontSize="small" />
              </IconButton>

              <IconButton
                type="button"
                size="small"
                color="primary"
                aria-label="Insert template"
                disabled={isReadOnly}
                onClick={(event) => openTemplatePopover(event.currentTarget)}
              >
                <TextSnippetRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Popover
              open={Boolean(emoticonAnchorEl)}
              anchorEl={emoticonAnchorEl}
              onClose={() => setEmoticonAnchorEl(null)}
              disableRestoreFocus
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                onMouseEnter: clearEmoticonCloseTimer,
                onMouseLeave: scheduleCloseEmoticonPopover,
                sx: { p: 1, maxWidth: 240 },
              }}
            >
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {GLOBAL_EMOTICON_OPTIONS.map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => handleInsertEmoticon(option.value)}
                    sx={{ minWidth: 0, px: 1.1 }}
                  >
                    {option.value}
                  </Button>
                ))}
              </Stack>
            </Popover>

            <Popover
              open={Boolean(templateAnchorEl)}
              anchorEl={templateAnchorEl}
              onClose={() => setTemplateAnchorEl(null)}
              disableRestoreFocus
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                onMouseEnter: clearTemplateCloseTimer,
                onMouseLeave: scheduleCloseTemplatePopover,
                sx: { p: 1, minWidth: 220 },
              }}
            >
              <Stack spacing={0.5}>
                {BLOG_TEMPLATE_OPTIONS.map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={() => handleInsertTemplate(option.value)}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Stack>
            </Popover>

            <TextField
              label="Content"
              placeholder="Write your post content"
              multiline
              minRows={12}
              InputLabelProps={{ shrink: true }}
              name={contentField.name}
              onBlur={contentField.onBlur}
              onChange={contentField.onChange}
              inputRef={(element) => {
                contentField.ref(element);
                contentInputRef.current = element;
              }}
              disabled={isReadOnly}
              sx={{
                '& textarea': {
                  fontFamily: '"Trebuchet MS", "Segoe UI", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                },
              }}
            />
          </Stack>

          <Box
            sx={{
              p: { xs: 1.5, md: 2 },
              borderRadius: 1.5,
              border: '1px solid',
              ...getBlogContentBackgroundSx(selectedBackgroundPreset),
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Content Preview
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: BLOG_CONTENT_FONT_COLOR,
                ...getBlogContentFontSx(selectedFontPreset),
                whiteSpace: 'pre-wrap',
              }}
            >
              {contentPreview?.trim() || 'Start typing content to preview your selected style.'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={() => router.push(paths.dashboard.blog.list)} color="inherit" variant="outlined">
              {isEditMode ? 'Back' : 'Cancel'}
            </Button>
            {(!isEditMode || isOwner) && (
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {isEditMode ? 'Save Changes' : 'Create Blog Post'}
              </LoadingButton>
            )}
          </Stack>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
