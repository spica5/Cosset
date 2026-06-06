import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
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

// ----------------------------------------------------------------------

const POSITION = 20;

type Props = {
  onCloseCompose: () => void;
  onSent?: () => void;
};

export function MailCompose({ onCloseCompose, onSent }: Props) {
  const smUp = useResponsive('up', 'sm');

  const fullScreen = useBoolean();
  const showCc = useBoolean();
  const showBcc = useBoolean();

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleChangeMessage = useCallback((value: string) => {
    setMessage(value);
  }, []);

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      toast.error('Add at least one recipient.');
      return;
    }

    if (!message.trim()) {
      toast.error('Write a message before sending.');
      return;
    }

    setSending(true);

    try {
      const result = await sendMail({
        to: to.trim(),
        cc: showCc.value ? cc.trim() : undefined,
        bcc: showBcc.value ? bcc.trim() : undefined,
        subject: subject.trim(),
        message,
      });

      if (result.deliveryErrors?.length) {
        toast.warning(result.message || 'Message saved in Cosset mail.');
      } else {
        toast.success(result.message || 'Message sent.');
      }
      onCloseCompose();
      onSent?.();
    } catch (error: unknown) {
      let msg = 'Could not send message.';
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
  }, [bcc, cc, message, onCloseCompose, onSent, showBcc.value, showCc.value, subject, to]);

  return (
    <Portal>
      {(fullScreen.value || !smUp) && (
        <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.modal - 1 }} />
      )}

      <Paper
        sx={{
          maxWidth: 560,
          right: POSITION,
          borderRadius: 2,
          display: 'flex',
          bottom: POSITION,
          position: 'fixed',
          overflow: 'hidden',
          flexDirection: 'column',
          zIndex: (theme) => theme.zIndex.modal,
          width: `calc(100% - ${POSITION * 2}px)`,
          boxShadow: (theme) => theme.customShadows.dropdown,
          ...(fullScreen.value && {
            maxWidth: 1,
            height: `calc(100% - ${POSITION * 2}px)`,
          }),
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          sx={{ bgcolor: 'background.neutral', p: (theme) => theme.spacing(1.5, 1, 1.5, 2) }}
        >
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            New message
          </Typography>

          <IconButton onClick={fullScreen.onToggle}>
            <Iconify icon={fullScreen.value ? 'eva:collapse-fill' : 'eva:expand-fill'} />
          </IconButton>

          <IconButton onClick={onCloseCompose} disabled={sending}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <InputBase
          placeholder="To"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          disabled={sending}
          endAdornment={
            <Stack direction="row" spacing={0.5} sx={{ typography: 'subtitle2' }}>
              <Box
                onClick={showCc.onToggle}
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                Cc
              </Box>
              <Box
                onClick={showBcc.onToggle}
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                Bcc
              </Box>
            </Stack>
          }
          sx={{
            px: 2,
            height: 48,
            borderBottom: (theme) =>
              `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        />

        {showCc.value ? (
          <InputBase
            placeholder="Cc"
            value={cc}
            onChange={(event) => setCc(event.target.value)}
            disabled={sending}
            sx={{
              px: 2,
              height: 48,
              borderBottom: (theme) =>
                `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            }}
          />
        ) : null}

        {showBcc.value ? (
          <InputBase
            placeholder="Bcc"
            value={bcc}
            onChange={(event) => setBcc(event.target.value)}
            disabled={sending}
            sx={{
              px: 2,
              height: 48,
              borderBottom: (theme) =>
                `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            }}
          />
        ) : null}

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
            overflow: 'hidden',
          }}
        >
          <Editor
            value={message}
            onChange={handleChangeMessage}
            placeholder="Type a message"
            slotProps={{
              wrap: {
                ...(fullScreen.value && { minHeight: 0, flex: '1 1 auto' }),
              },
            }}
            sx={{
              maxHeight: 480,
              ...(fullScreen.value && { maxHeight: 1, flex: '1 1 auto' }),
            }}
          />

          <Stack direction="row" alignItems="center">
            <Stack direction="row" alignItems="center" flexGrow={1}>
              <IconButton disabled>
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
    </Portal>
  );
}
