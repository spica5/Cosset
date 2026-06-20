import type { IMail } from 'src/types/mail';

import { useState, useEffect, useCallback } from 'react';

import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Portal from '@mui/material/Portal';
import Backdrop from '@mui/material/Backdrop';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';

import { sendMail } from 'src/actions/mail';
import { varAlpha } from 'src/theme/dashboard/styles';
import { toast } from 'src/components/dashboard/snackbar';

import { Editor } from 'src/components/dashboard/editor';
import { Iconify } from 'src/components/dashboard/iconify';

import {
  DEFAULT_MAIL_PAPER_STYLE,
  type MailPaperStyleId,
} from 'src/constants/mail-paper-styles';

import { MailWritingFonts } from './mail-writing-fonts';
import { MailPaperBackgroundPickerMenu } from './mail-paper-background-picker';
import {
  buildQuotedMessage,
  buildReplySubject,
  getReplyRecipient,
  hasMailMessageContent,
} from './mail-compose-utils';
import { mailComposeEditorSx, mailComposePaperSx } from './mail-compose-layout';

// ----------------------------------------------------------------------

type Props = {
  mail: IMail;
  userEmail?: string;
  onCloseReply: () => void;
  onSent?: () => void;
};

export function MailReplyCompose({ mail, userEmail, onCloseReply, onSent }: Props) {
  const smUp = useResponsive('up', 'sm');
  const fullScreen = useBoolean();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [paperStyle, setPaperStyle] = useState<MailPaperStyleId>(DEFAULT_MAIL_PAPER_STYLE);
  const [paperBackgroundImage, setPaperBackgroundImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [backgroundMenuAnchor, setBackgroundMenuAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTo(getReplyRecipient(mail, userEmail));
    setSubject(buildReplySubject(mail.subject));
    setMessage('');
    setPaperStyle(DEFAULT_MAIL_PAPER_STYLE);
    setPaperBackgroundImage(null);
  }, [mail.id, mail, userEmail]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleChangeMessage = useCallback((value: string) => {
    setMessage(value);
  }, []);

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      toast.error('No recipient found for this reply.');
      return;
    }

    if (!hasMailMessageContent(message)) {
      toast.error('Write a reply before sending.');
      return;
    }

    setSending(true);

    try {
      const result = await sendMail({
        to: to.trim(),
        subject: subject.trim(),
        message: `${message}${buildQuotedMessage(mail)}`,
        paperStyle,
        paperBackgroundImage,
      });

      if (result.deliveryErrors?.length) {
        toast.warning(result.message || 'Reply saved in Cosset mail.');
      } else {
        toast.success(result.message || 'Reply sent.');
      }

      onCloseReply();
      onSent?.();
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
  }, [mail, message, onCloseReply, onSent, paperBackgroundImage, paperStyle, subject, to]);

  return (
    <Portal>
      {(fullScreen.value || !smUp) && (
        <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.modal - 1 }} />
      )}

      <Paper sx={mailComposePaperSx(fullScreen.value)}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{ bgcolor: 'background.neutral', p: (theme) => theme.spacing(1.5, 1, 1.5, 2) }}
        >
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Reply
          </Typography>

          <IconButton onClick={fullScreen.onToggle}>
            <Iconify icon={fullScreen.value ? 'eva:collapse-fill' : 'eva:expand-fill'} />
          </IconButton>

          <IconButton onClick={onCloseReply} disabled={sending}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <InputBase
          placeholder="To"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          disabled={sending}
          sx={{
            px: 2,
            height: 48,
            borderBottom: (theme) =>
              `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        />

        <InputBase
          placeholder="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={sending}
          sx={{
            px: 2,
            height: 48,
            borderBottom: (theme) =>
              `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        />

        <Stack
          spacing={2}
          flexGrow={1}
          sx={{
            p: 2,
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <MailWritingFonts />
          </Box>

          <Editor
            value={message}
            onChange={handleChangeMessage}
            editable={!sending}
            typographyTools
            paperStyle={paperStyle}
            onPaperStyleChange={setPaperStyle}
            paperBackgroundImage={paperBackgroundImage}
            onPaperBackgroundImageChange={setPaperBackgroundImage}
            placeholder="Write your reply..."
            slotProps={{
              wrap: {
                minHeight: 0,
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
              },
            }}
            sx={mailComposeEditorSx(fullScreen.value)}
          />

          <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" flexGrow={1}>
              <IconButton
                disabled={sending}
                onClick={(event) => setBackgroundMenuAnchor(event.currentTarget)}
                aria-label="Choose background image"
                color={paperBackgroundImage ? 'primary' : 'default'}
              >
                <Iconify icon="solar:gallery-add-bold" />
              </IconButton>

              <IconButton disabled>
                <Iconify icon="eva:attach-2-fill" />
              </IconButton>
            </Stack>

            <Button
              variant="contained"
              color="primary"
              disabled={sending}
              onClick={() => handleSend()}
              endIcon={<Iconify icon="iconamoon:send-fill" />}
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <MailPaperBackgroundPickerMenu
        anchorEl={backgroundMenuAnchor}
        open={Boolean(backgroundMenuAnchor)}
        onClose={() => setBackgroundMenuAnchor(null)}
        selectedImageKey={paperBackgroundImage}
        onSelect={setPaperBackgroundImage}
        disabled={sending}
      />
    </Portal>
  );
}
