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
import { deleteMail, sendMail, updateMailFlags } from 'src/actions/mail';
import { maxLine, stylesMode } from 'src/theme/dashboard/styles';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { toast } from 'src/components/dashboard/snackbar';

import { Label } from 'src/components/dashboard/label';
import { Editor } from 'src/components/dashboard/editor';
import { Iconify } from 'src/components/dashboard/iconify';
import { Scrollbar } from 'src/components/dashboard/scrollbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { FileThumbnail } from 'src/components/dashboard/file-thumbnail';
import { LoadingScreen } from 'src/components/dashboard/loading-screen';

import {
  DEFAULT_MAIL_PAPER_STYLE,
  type MailPaperStyleId,
} from 'src/constants/mail-paper-styles';

import { MailAvatar } from './mail-avatar';
import { MailWritingFonts } from './mail-writing-fonts';
import { MailMessageContent } from './mail-message-content';
import {
  buildQuotedMessage,
  buildReplySubject,
  getReplyRecipient,
  hasMailMessageContent,
} from './mail-compose-utils';

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
    return <LoadingScreen />;
  }

  if (empty || !mail) {
    return (
      <EmptyContent
        title="No conversation selected"
        description="Select a conversation to read"
        imgUrl={`${CONFIG.dashboard.assetsDir}/assets/icons/empty/ic-email-selected.svg`}
      />
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
  const { user } = useAuthContext();

  const [replyMessage, setReplyMessage] = useState('');
  const [paperStyle, setPaperStyle] = useState<MailPaperStyleId>(DEFAULT_MAIL_PAPER_STYLE);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingFlags, setUpdatingFlags] = useState(false);

  const userEmail = typeof user?.email === 'string' ? user.email : undefined;

  useEffect(() => {
    setReplyMessage('');
    setPaperStyle(DEFAULT_MAIL_PAPER_STYLE);
  }, [mail.id]);

  const handleSendReply = useCallback(async () => {
    if (!hasMailMessageContent(replyMessage)) {
      toast.error('Write a reply before sending.');
      return;
    }

    const recipient = getReplyRecipient(mail, userEmail);
    if (!recipient) {
      toast.error('No recipient found for this reply.');
      return;
    }

    setSending(true);

    try {
      const result = await sendMail({
        to: recipient,
        subject: buildReplySubject(mail.subject),
        message: `${replyMessage}${buildQuotedMessage(mail)}`,
        paperStyle,
      });

      if (result.deliveryErrors?.length) {
        toast.warning(result.message || 'Reply saved in Cosset mail.');
      } else {
        toast.success(result.message || 'Reply sent.');
      }

      setReplyMessage('');
      onReplySent?.();
    } catch (error: unknown) {
      let msg = 'Could not send reply.';
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
      setSending(false);
    }
  }, [mail, onReplySent, paperStyle, replyMessage, userEmail]);

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

        {/* <Tooltip title="Archive">
          <IconButton>
            <Iconify icon="solar:archive-down-minimlistic-bold" />
          </IconButton>
        </Tooltip> */}

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
            <Iconify width={18} icon="solar:reply-bold" />
          </IconButton>

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
    <MailMessageContent message={mail.message} paperStyle={mail.paperStyle} />
  );

  const renderEditor = (
    <>
      <Editor
        value={replyMessage}
        onChange={setReplyMessage}
        editable={!sending}
        typographyTools
        paperStyle={paperStyle}
        onPaperStyleChange={setPaperStyle}
        placeholder="Write your reply..."
        sx={{ maxHeight: 320 }}
      />

      <Box display="flex" alignItems="center">
        <IconButton disabled>
          <Iconify icon="solar:gallery-add-bold" />
        </IconButton>

        <IconButton disabled>
          <Iconify icon="eva:attach-2-fill" />
        </IconButton>

        <Stack flexGrow={1} />

        <Button
          color="primary"
          variant="contained"
          disabled={sending}
          onClick={() => handleSendReply()}
          endIcon={<Iconify icon="iconamoon:send-fill" />}
        >
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </Box>
    </>
  );

  return (
    <>
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

      {!!mail.attachments.length && <Stack sx={{ px: 2, mt: 2 }}> {renderAttachments} </Stack>}

      <Scrollbar sx={{ mt: 1, flex: '1 1 240px', pb: 1 }}>{renderContent}</Scrollbar>

      <Stack flexShrink={0} spacing={2} sx={{ p: 2 }}>
        {renderEditor}
      </Stack>
    </>
  );
}
