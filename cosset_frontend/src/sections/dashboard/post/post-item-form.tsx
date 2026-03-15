'use client';

import type { IPostItem } from 'src/types/post';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { deletePost } from 'src/actions/post';
import { useAuthContext } from 'src/auth/hooks';
import { Iconify } from 'src/components/dashboard/iconify';
import { toast } from 'src/components/dashboard/snackbar';
import { CustomPopover, usePopover } from 'src/components/dashboard/custom-popover';

import { PostAttachmentsGallery } from './post-attachments-gallery';
import { PostAuthorInfo } from './post-author-info';

// ----------------------------------------------------------------------

type Props = {
  post: IPostItem;
};

const PREVIEW_LENGTH = 20;

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

const getPostContent = (post: IPostItem) => {
  const source = post.content || '';
  const text = source.trim();

  if (!text) {
    return 'No content yet.';
  }

  return text;
};

const getPostAuthorName = (post: IPostItem) => {
  const fullName = `${post.customerFirstName || ''} ${post.customerLastName || ''}`.trim();

  return post.customerDisplayName || fullName || post.customerEmail || post.customerId || 'Customer';
};

export function PostItemForm({ post }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const popover = usePopover();
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isFollowingPost, setIsFollowingPost] = useState(false);

  const content = getPostContent(post);
  const hasMoreThanPreview = content !== 'No content yet.' && content.length > PREVIEW_LENGTH;
  const isOwner = String(post.customerId || '') === String(user?.id || '');

  const toggleExpanded = () => {
    if (!hasMoreThanPreview) {
      return;
    }

    setExpanded((prev) => !prev);
  };

  const handleArticleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  const handleEdit = () => {
    if (!isOwner) {
      return;
    }

    popover.onClose();
    router.push(paths.dashboard.community.post.edit(post.id));
  };

  const handleDelete = async () => {
    if (!isOwner) {
      return;
    }

    popover.onClose();

    const confirmed = window.confirm(`Delete post "${post.title || post.id}"?`);

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await deletePost(post.id, post.customerId || undefined);
      toast.success('Post deleted successfully.');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
              sx={{ minWidth: 0, flex: 1 }}
            >
              <PostAuthorInfo
                name={getPostAuthorName(post)}
                photoURL={post.customerPhotoURL}
                size={44}
              />

              <Typography variant="h6" sx={{ minWidth: 0 }} noWrap>
                {post.title || `Untitled Post #${post.id}`}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ ml: 'auto', flexShrink: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Iconify width={16} icon="eva:eye-fill" sx={{ color: 'info.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Views: {post.totalViews ?? 0}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Iconify width={16} icon="eva:people-fill" sx={{ color: 'success.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Following: {post.following ?? 0}
                </Typography>
              </Stack>

              {isOwner ? (
                <IconButton onClick={popover.onOpen} aria-label="Post actions" sx={{ mt: -0.5, mr: -0.5 }}>
                  <Iconify icon="eva:more-vertical-fill" sx={{ color: 'text.secondary' }} />
                </IconButton>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify icon="eva:clock-outline" sx={{ color: 'warning.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
               {formatDate(post.createdAt)}
            </Typography>
          </Stack>

          <Divider />

          <Box
            role={hasMoreThanPreview ? 'button' : undefined}
            tabIndex={hasMoreThanPreview ? 0 : -1}
            onClick={toggleExpanded}
            onKeyDown={handleArticleKeyDown}
            sx={{
              p: 1,
              borderRadius: 1.5,
              cursor: hasMoreThanPreview ? 'pointer' : 'default',
              '&:hover': hasMoreThanPreview ? { bgcolor: 'action.hover' } : undefined,
              '&:focus-visible': hasMoreThanPreview
                ? {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                  }
                : undefined,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                whiteSpace: expanded ? 'pre-wrap' : 'normal',
                ...(expanded
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

            {hasMoreThanPreview ? (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {expanded ? 'Click article to collapse' : 'Click article to expand'}
                </Typography>
                <Iconify
                  width={14}
                  icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                  sx={{ color: 'primary.main' }}
                />
              </Stack>
            ) : null}

            <PostAttachmentsGallery
              files={post.files}
              heading="Attached files"
              stopPropagation
              imageWidth={200}
              imageHeight={120}
            />
          </Box>

          <Divider />

          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Button
              size="small"
              color={liked ? 'primary' : 'inherit'}
              variant={liked ? 'contained' : 'text'}
              startIcon={
                <Iconify
                  icon={liked ? 'solar:heart-bold' : 'solar:heart-linear'}
                  sx={{ color: liked ? 'error.main' : 'text.secondary' }}
                />
              }
              onClick={() => setLiked((prev) => !prev)}
              sx={{ flex: 1 }}
            >
              Like
            </Button>

            <Button
              size="small"
              color={isFollowingPost ? 'primary' : 'inherit'}
              variant={isFollowingPost ? 'contained' : 'text'}
              startIcon={
                <Iconify
                  icon={isFollowingPost ? 'solar:user-check-rounded-bold' : 'solar:user-plus-bold'}
                  sx={{ color: isFollowingPost ? 'success.main' : 'text.secondary' }}
                />
              }
              onClick={() => setIsFollowingPost((prev) => !prev)}
              sx={{ flex: 1 }}
            >
              Following
            </Button>
          </Stack>
        </Stack>
      </Card>

      {isOwner ? (
        <CustomPopover
          open={popover.open}
          anchorEl={popover.anchorEl}
          onClose={popover.onClose}
          slotProps={{ arrow: { placement: 'right-top' } }}
        >
          <MenuList>
            <MenuItem onClick={handleEdit}>
              <Iconify icon="solar:pen-bold" sx={{ color: 'info.main' }} />
              Edit post
            </MenuItem>

            <MenuItem onClick={handleDelete} disabled={isDeleting} sx={{ color: 'error.main' }}>
              <Iconify icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
              {isDeleting ? 'Deleting...' : 'Delete post'}
            </MenuItem>
          </MenuList>
        </CustomPopover>
      ) : null}

    </>
  );
}