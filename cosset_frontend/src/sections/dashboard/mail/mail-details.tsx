'use client';

import type { IMail, IMailLabel } from 'src/types/mail';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Checkbox from '@mui/material/Checkbox';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { darken, lighten, alpha as hexAlpha } from '@mui/material/styles';

import { useBoolean } from 'src/hooks/use-boolean';

import { fDateTime } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';
import { deleteMail, updateMailFlags } from 'src/actions/mail';
import { maxLine, stylesMode } from 'src/theme/dashboard/styles';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { toast } from 'src/components/dashboard/snackbar';

import { Label } from 'src/components/dashboard/label';
import { Iconify } from 'src/components/dashboard/iconify';
import { Scrollbar } from 'src/components/dashboard/scrollbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { FileThumbnail } from 'src/components/dashboard/file-thumbnail';
import { LoadingScreen } from 'src/components/dashboard/loading-screen';

import { MailAvatar } from './mail-avatar';
import { MailWritingFonts } from './mail-writing-fonts';
import { MailReplyCompose } from './mail-reply-compose';
import { MailMessageContent } from './mail-message-content';

// ----------------------------------------------------------------------

const mailDetailsRootSx = {
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
} as const;

// ----------------------------------------------------------------------

type Props = {
  mail?: IMail;
  empty: boolean;
  loading: boolean;
  renderLabel: (id: string) => IMailLabel;
  onReplySent?: () => void;
  onDeleted?: (mailId: string) => void;
};

export function MailDetails({ mail, renderLabel, empty, loading, onReplySent, onDeleted }: Props) {
  if (loading) {
    return (
      <Stack sx={mailDetailsRootSx}>
        <LoadingScreen />
      </Stack>
    );
  }

  if (empty || !mail) {
    return (
      <Stack sx={mailDetailsRootSx}>
        <EmptyContent
          title="No conversation selected"
          description="Select a conversation to read"
          imgUrl={`${CONFIG.dashboard.assetsDir}/assets/icons/empty/ic-email-selected.svg`}
        />
      </Stack>
    );
  }

  return (
    <MailDetailsContent
      mail={mail}
      renderLabel={renderLabel}
      onReplySent={onReplySent}
      onDeleted={onDeleted}
    />
  );
}

// ----------------------------------------------------------------------

type ContentProps = {
  mail: IMail;
  renderLabel: (id: string) => IMailLabel;
  onReplySent?: () => void;
  onDeleted?: (mailId: string) => void;
};

function MailDetailsContent({ mail, renderLabel, onReplySent, onDeleted }: ContentProps) {
  const showAttachments = useBoolean(true);
  const showReplyComposer = useBoolean(false);
  const { user } = useAuthContext();

  const [deleting, setDeleting] = useState(false);
  const [updatingFlags, setUpdatingFlags] = useState(false);

  const userEmail = typeof user?.email === 'string' ? user.email : undefined;

  useEffect(() => {
    showReplyComposer.onFalse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mail.id]);

  const handleDeleteMail = useCallback(async () => {
    if (deleting) {
      return;
    }

    setDeleting(true);

    try {
      const result = await deleteMail(mail.id, mail);
      toast.success(
        result.message ||
          (mail.folder === 'trash' ? 'Mail permanently deleted' : 'Mail moved to trash'),
      );
      onDeleted?.(mail.id);
    } catch (error: unknown) {
      let msg = 'Could not delete mail.';
      if (typeof error === 'string') {
        msg = error;
      } else if (error instanceof Error) {
        msg = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        const data = error as { message?: unknown };
        if (typeof data.message === 'string') {
          msg = data.message;
        }
      }
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }, [deleting, mail, onDeleted]);

  const handleToggleStarred = useCallback(async () => {
    if (updatingFlags) {
      return;
    }

    setUpdatingFlags(true);
    try {
      await updateMailFlags(mail.id, { isStarred: !mail.isStarred }, mail);
    } catch {
      toast.error('Could not update starred status.');
    } finally {
      setUpdatingFlags(false);
    }
  }, [mail, updatingFlags]);

  const handleToggleImportant = useCallback(async () => {
    if (updatingFlags) {
      return;
    }

    setUpdatingFlags(true);
    try {
      await updateMailFlags(mail.id, { isImportant: !mail.isImportant }, mail);
    } catch {
      toast.error('Could not update important status.');
    } finally {
      setUpdatingFlags(false);
    }
  }, [mail, updatingFlags]);

  const handleMarkUnread = useCallback(async () => {
    if (updatingFlags || mail.isUnread) {
      return;
    }

    setUpdatingFlags(true);
    try {
      await updateMailFlags(mail.id, { isUnread: true }, mail);
      toast.success('Marked as unread.');
    } catch {
      toast.error('Could not mark mail as unread.');
    } finally {
      setUpdatingFlags(false);
    }
  }, [mail, updatingFlags]);

  const renderHead = (
    <>
      <Box gap={1} display="flex" flexGrow={1}>
        {mail.labelIds.map((labelId) => {
          const label = renderLabel(labelId);

          return label ? (
            <Label
              key={label.id}
              sx={{
                color: darken(label.color, 0.24),
                bgcolor: hexAlpha(label.color, 0.16),
                [stylesMode.dark]: { color: lighten(label.color, 0.24) },
              }}
            >
              {label.name}
            </Label>
          ) : null;
        })}
      </Box>

      <Box display="flex" alignItems="center">
        <Tooltip title="Reply">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:reply-bold" />}
            onClick={showReplyComposer.onTrue}
            sx={{ mr: 0.5, flexShrink: 0 }}
          >
            Reply
          </Button>
        </Tooltip>

        <Tooltip title={mail.isStarred ? 'Remove star' : 'Star'}>
          <Checkbox
            color="warning"
            icon={<Iconify icon="eva:star-outline" />}
            checkedIcon={<Iconify icon="eva:star-fill" />}
            checked={mail.isStarred}
            disabled={updatingFlags}
            onChange={() => handleToggleStarred()}
            inputProps={{ id: 'starred-checkbox', 'aria-label': 'Starred checkbox' }}
          />
        </Tooltip>

        <Tooltip title={mail.isImportant ? 'Remove important' : 'Mark important'}>
          <Checkbox
            color="warning"
            icon={<Iconify icon="material-symbols:label-important-rounded" />}
            checkedIcon={<Iconify icon="material-symbols:label-important-rounded" />}
            checked={mail.isImportant}
            disabled={updatingFlags}
            onChange={() => handleToggleImportant()}
            inputProps={{ id: 'important-checkbox', 'aria-label': 'Important checkbox' }}
          />
        </Tooltip>

        <Tooltip title={mail.isUnread ? 'Already unread' : 'Mark as unread'}>
          <span>
            <IconButton disabled={updatingFlags || mail.isUnread} onClick={() => handleMarkUnread()}>
              <Iconify icon="fluent:mail-unread-20-filled" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={mail.folder === 'trash' ? 'Delete permanently' : 'Move to trash'}>
          <span>
            <IconButton onClick={() => handleDeleteMail()} disabled={deleting}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </span>
        </Tooltip>

        <IconButton>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
      </Box>
    </>
  );

  const renderSubject = (
    <>
      <Typography variant="subtitle1" sx={{ ...maxLine({ line: 2 }), flex: '1 1 auto' }}>
        {mail.subject?.trim() || '(No subject)'}
      </Typography>

      <Stack spacing={0.5}>
        <Box display="flex" alignItems="center" justifyContent="flex-end">
          <Typography variant="caption" noWrap sx={{ color: 'text.disabled' }}>
            {fDateTime(mail.createdAt)}
          </Typography>

          <IconButton size="small">
            <Iconify width={18} icon="solar:multiple-forward-left-broken" />
          </IconButton>

          <IconButton size="small">
            <Iconify width={18} icon="solar:forward-bold" />
          </IconButton>
        </Box>
      </Stack>
    </>
  );

  const renderSender = (
    <>
      <MailAvatar
        name={mail.from.name}
        photoKeyOrUrl={mail.from.avatarUrl}
        sx={{ width: 40, height: 40, mr: 2 }}
      />

      <Stack spacing={0.5} sx={{ width: 0, flexGrow: 1 }}>
        <Box gap={0.5} display="flex">
          <Typography component="span" variant="subtitle2" sx={{ flexShrink: 0 }}>
            {mail.from.name}
          </Typography>
          <Typography component="span" noWrap variant="body2" sx={{ color: 'text.secondary' }}>
            {`<${mail.from.email}>`}
          </Typography>
        </Box>

        <Typography noWrap component="span" variant="caption" sx={{ color: 'text.secondary' }}>
          {`To: `}
          {mail.to.map((person) => (
            <Link key={person.email} color="inherit" sx={{ '&:hover': { color: 'text.primary' } }}>
              {`${person.email}, `}
            </Link>
          ))}
        </Typography>
      </Stack>
    </>
  );

  const renderAttachments = (
    <Stack spacing={1} sx={{ p: 1, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <ButtonBase
          onClick={showAttachments.onToggle}
          sx={{ borderRadius: 0.5, typography: 'caption', color: 'text.secondary' }}
        >
          <Iconify icon="eva:attach-2-fill" sx={{ mr: 0.5 }} />
          {mail.attachments.length} attachments
          <Iconify
            icon={
              showAttachments.value ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'
            }
            width={16}
            sx={{ ml: 0.5 }}
          />
        </ButtonBase>

        <ButtonBase
          sx={{
            py: 0.5,
            gap: 0.5,
            px: 0.75,
            borderRadius: 0.75,
            typography: 'caption',
            fontWeight: 'fontWeightSemiBold',
          }}
        >
          <Iconify width={18} icon="eva:cloud-download-fill" /> Download
        </ButtonBase>
      </Box>

      <Collapse in={showAttachments.value} unmountOnExit timeout="auto">
        <Box gap={0.75} display="flex" flexWrap="wrap">
          {mail.attachments.map((attachment) => (
            <FileThumbnail
              key={attachment.id}
              tooltip
              imageView
              file={attachment.preview}
              onDownload={() => console.info('DOWNLOAD')}
              sx={{ width: 48, height: 48, backgroundColor: 'background.neutral' }}
              slotProps={{ icon: { width: 24, height: 24 } }}
            />
          ))}
        </Box>
      </Collapse>
    </Stack>
  );

  const renderContent = (
    <MailMessageContent
      message={mail.message}
      paperStyle={mail.paperStyle}
      paperBackgroundImage={mail.paperBackgroundImage}
    />
  );

  return (
    <Stack sx={mailDetailsRootSx}>
      <MailWritingFonts />

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexShrink={0}
        sx={{ px: 2, height: 56 }}
      >
        <Box display="flex" alignItems="center" flexGrow={1}>
          {renderSender}
        </Box>

        <Box display="flex" alignItems="center">
          {renderHead}
        </Box>
      </Box>

      <Box
        gap={2}
        flexShrink={0}
        display="flex"
        sx={(theme) => ({
          p: 2,
          borderTop: `1px dashed ${theme.vars.palette.divider}`,
        })}
      >
        {renderSubject}
      </Box>

      {!!mail.attachments.length && (
        <Stack flexShrink={0} sx={{ px: 2, mt: 2 }}>
          {renderAttachments}
        </Stack>
      )}

      <Scrollbar
        fillContent
        slotProps={{
          wrapper: { height: '100%' },
          contentWrapper: { height: '100%' },
          content: { minHeight: '100%', display: 'flex', flexDirection: 'column' },
        }}
        sx={{ mt: 1, flex: '1 1 auto', minHeight: 0, pb: 1 }}
      >
        {renderContent}
      </Scrollbar>

      {showReplyComposer.value ? (
        <MailReplyCompose
          mail={mail}
          userEmail={userEmail}
          onCloseReply={showReplyComposer.onFalse}
          onSent={onReplySent}
        />
      ) : null}
    </Stack>
  );
}
