import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { addPostComment, deletePostComment, updatePostCommentVisibility } from 'src/actions/post';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type CommentInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  submitting?: boolean;
  authenticated?: boolean;
  submitLabel?: string;
  emojiOptions?: string[];
};

export function CommentInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a comment...',
  disabled = false,
  submitting = false,
  authenticated = true,
  submitLabel = 'Comment',
  emojiOptions = ['😊', '😂', '❤️', '😮', '😢', '😡'],
}: CommentInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) {
      onChange(`${value}${emoji}`);
      return;
    }

    const inputEl = inputRef.current;
    const start = inputEl.selectionStart ?? value.length;
    const end = inputEl.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + emoji + value.slice(end);

    onChange(nextValue);

    window.requestAnimationFrame(() => {
      inputEl.focus();
      const pos = start + emoji.length;
      inputEl.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <Stack direction="column" spacing={1}>
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {emojiOptions.map((emoji) => (
          <Button
            key={emoji}
            size="small"
            onClick={() => insertEmoji(emoji)}
            disabled={!authenticated || submitting}
            sx={{ minWidth: 32, p: 0.5, fontSize: '0.85rem' }}
          >
            {emoji}
          </Button>
        ))}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder={authenticated ? placeholder : 'Sign in to write a comment'}
          inputRef={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || !authenticated || submitting}
          onKeyDown={handleKeyDown}
        />

        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={disabled || !authenticated || submitting || !value.trim()}
        >
          {submitting ? 'Sending...' : submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

type CommentItemProps = {
  id: string | number;
  visible?: boolean | null;
  customerId?: string | number | null;
  viewerId?: string;
  canDelete?: boolean;
  canToggleVisibility?: boolean;
  deleting?: boolean;
  togglingVisibility?: boolean;
  onDelete?: (commentId: string | number) => void;
  onToggleVisibility?: (commentId: string | number, visible: boolean) => void;
  authorName: string;
  createdAt: string;
  comment: string;
  formatDate?: (date: string) => string;
};

export function CommentItem({
  id,
  visible,
  customerId,
  viewerId,
  canDelete = false,
  canToggleVisibility = false,
  deleting = false,
  togglingVisibility = false,
  onDelete,
  onToggleVisibility,
  authorName,
  createdAt,
  comment,
  formatDate = (date) => date,
}: CommentItemProps) {
  const isCommentOwner = !!viewerId && !!customerId && String(viewerId) === String(customerId);
  const isVisible = visible !== false;

  // If comment is hidden and current user is neither the comment owner nor the page owner (canToggleVisibility),
  // don't render it at all
  if (!isVisible && !isCommentOwner && !canToggleVisibility) {
    return null;
  }

  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: isVisible ? 'background.neutral' : 'action.disabled',
        border: '1px solid',
        borderColor: isVisible ? 'divider' : 'divider',
        opacity: isVisible ? 1 : 0.6,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
            {authorName}
          </Typography>

          {canToggleVisibility && onToggleVisibility ? (
            <IconButton
              size="small"
              color={isVisible ? 'info' : 'inherit'}
              onClick={() => onToggleVisibility?.(id, !isVisible)}
              disabled={togglingVisibility}
              sx={{ p: 0.25 }}
              title={isVisible ? 'Hide from universe page' : 'Show on universe page'}
            >
              <Iconify icon={isVisible ? 'mdi:eye' : 'mdi:eye-off'} width={14} />
            </IconButton>
          ) : null}

          {canDelete && isCommentOwner ? (
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete?.(id)}
              disabled={deleting}
              sx={{ p: 0.25 }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={14} />
            </IconButton>
          ) : null}
        </Stack>

        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
          {formatDate(createdAt)}
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, whiteSpace: 'pre-wrap' }}>
        {comment}
      </Typography>

      {!isVisible ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          (Hidden from universe page)
        </Typography>
      ) : null}
    </Box>
  );
}

// ----------------------------------------------------------------------

type CommentsSectionProps = {
  targetType: string;
  targetId: string;
  comments: Array<{
    id: string | number;
    comment: string;
    createdAt: string | Date | undefined;
    customerId?: string | number | null;
    customerDisplayName?: string | null;
    customerFirstName?: string | null;
    customerLastName?: string | null;
    customerEmail?: string | null;
    visible?: boolean | null;
  }>;
  commentsLoading?: boolean;
  commentsValidating?: boolean;
  authenticated?: boolean;
  viewerId?: string;
  isOwner?: boolean;
  formatDate?: (date: any) => string;
  emptyMessage?: string;
  emojiOptions?: string[];
  onCommentsVisibilityChange?: (visible: boolean) => void;
  onCommentVisibilityToggle?: (commentId: string | number, visible: boolean) => void;
  commentsHidden?: boolean;
  togglingCommentVisibility?: boolean;
};

export function CommentsSection({
  targetType,
  targetId,
  comments,
  commentsLoading = false,
  commentsValidating = false,
  authenticated = true,
  viewerId,
  isOwner = false,
  formatDate = (date) => date,
  emptyMessage = 'No comments yet.',
  emojiOptions = ['😊', '😂', '❤️', '😮', '😢', '😡'],
  onCommentsVisibilityChange,
  onCommentVisibilityToggle,
  commentsHidden = false,
  togglingCommentVisibility = false,
}: CommentsSectionProps) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | number | null>(null);
  const [isTogglingCommentVisibility, setIsTogglingCommentVisibility] = useState(false);

  const isCommentVisible = (visible: unknown): boolean => visible === true || Number(visible) === 1;

  const commentsForViewer = comments.filter((comment) => {
    const commentOwner =
      !!viewerId && !!comment.customerId && String(viewerId) === String(comment.customerId);

    return isCommentVisible(comment.visible) || isOwner || commentOwner;
  });

  const visibleCommentsCount = commentsForViewer.filter((comment) => isCommentVisible(comment.visible)).length;

  const handleSubmitComment = async () => {
    const normalizedComment = commentInput.trim();

    if (!authenticated || !viewerId || !normalizedComment) {
      return;
    }

    try {
      setIsSubmittingComment(true);

      const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;
      const derivedPrevCustomer = comments.length === 0 ? viewerId : String(latestComment?.customerId || viewerId);

      await addPostComment({
        targetType,
        targetId,
        comment: normalizedComment,
        customerId: String(viewerId),
        prevCustomer: derivedPrevCustomer,
      });

      setCommentInput('');
    } catch (error) {
      console.error('Failed to add comment', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const canDeleteOwnComments = authenticated;

  const handleDeleteComment = async (commentId: string | number) => {
    if (!viewerId || !canDeleteOwnComments) {
      return;
    }

    try {
      setDeletingCommentId(commentId);
      await deletePostComment({
        commentId,
        targetId,
        targetType,
      });
    } catch (error) {
      console.error('Failed to delete comment', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleToggleVisibility = async (commentId: string | number, visible: boolean) => {
    if (!viewerId) {
      return;
    }

    try {
      setIsTogglingCommentVisibility(true);

      if (onCommentVisibilityToggle) {
        await onCommentVisibilityToggle(commentId, visible);
        return;
      }

      await updatePostCommentVisibility({
        commentId,
        visible,
        targetId,
        targetType,
      });
    } catch (error) {
      console.error('Failed to toggle comment visibility', error);
    } finally {
      setIsTogglingCommentVisibility(false);
    }
  };

  return (
    <>
      {!commentsHidden ? (
        <Card sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack spacing={1.25}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Iconify icon="solar:chat-round-dots-bold" width={16} sx={{ color: 'warning.main' }} />
                <Typography variant="subtitle2">Comments ({visibleCommentsCount})</Typography>
              </Stack>

              <Button
                size="small"
                variant="text"
                onClick={() => setCommentsExpanded((prev) => !prev)}
                endIcon={
                  <Iconify
                    width={14}
                    icon={commentsExpanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                  />
                }
              >
                {commentsExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </Stack>

            {commentsExpanded ? (
              <>
                <Stack spacing={0.75} sx={{ maxHeight: 190, overflowY: 'auto', pr: 0.5 }}>
                  {commentsForViewer.map((comment) => {
                    const authorName =
                      comment.customerDisplayName ||
                      `${comment.customerFirstName || ''} ${comment.customerLastName || ''}`.trim() ||
                      comment.customerEmail ||
                      String(comment.customerId || 'Customer');

                    return (
                      <CommentItem
                        key={comment.id}
                        id={comment.id}
                        visible={comment.visible}
                        customerId={comment.customerId}
                        viewerId={viewerId}
                        canDelete={canDeleteOwnComments}
                        canToggleVisibility={isOwner}
                        deleting={deletingCommentId === comment.id}
                        togglingVisibility={togglingCommentVisibility || isTogglingCommentVisibility}
                        onDelete={handleDeleteComment}
                        onToggleVisibility={handleToggleVisibility}
                        authorName={authorName}
                        createdAt={comment.createdAt instanceof Date ? comment.createdAt.toISOString() : String(comment.createdAt || '')}
                        comment={comment.comment}
                        formatDate={formatDate}
                      />
                    );
                  })}

                  {!commentsLoading && commentsForViewer.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      {emptyMessage}
                    </Typography>
                  ) : null}
                </Stack>

                <CommentInput
                  value={commentInput}
                  onChange={setCommentInput}
                  onSubmit={handleSubmitComment}
                  disabled={!authenticated || isSubmittingComment}
                  submitting={isSubmittingComment}
                  authenticated={authenticated}
                  emojiOptions={emojiOptions}
                />

                {commentsLoading || commentsValidating ? (
                  <Typography variant="caption" color="text.secondary">
                    Refreshing comments...
                  </Typography>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Card>
      ) : null}
    </>
  );
}