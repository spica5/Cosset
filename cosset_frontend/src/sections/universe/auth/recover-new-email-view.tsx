'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Logo } from 'src/components/universe/logo';

import { confirmRecoveryNewEmail, requestRecoveryNewEmail } from 'src/auth/context/jwt';
import {
  clearRecoveryState,
  readRecoveryState,
  writeRecoveryState,
  type StoredRecoveryState,
} from 'src/auth/utils/recovery-storage';

import { FormReturnLink } from './components/form-return-link';

// ----------------------------------------------------------------------

export function RecoverNewEmailView() {
  const router = useRouter();
  const [state, setState] = useState<StoredRecoveryState | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const stored = readRecoveryState();
    if (!stored?.recoveryToken) {
      router.replace(paths.auth.recoverAccount);
      return;
    }
    setState(stored);
    if (stored.newEmail) {
      setNewEmail(stored.newEmail);
      setCodeSent(true);
    }
  }, [router]);

  const handleSendCode = async () => {
    try {
      setSending(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!state?.recoveryToken) {
        throw new Error('Recovery session missing. Start again.');
      }
      if (!newEmail.trim()) {
        throw new Error('Enter your new email address.');
      }

      const result = await requestRecoveryNewEmail({
        recoveryToken: state.recoveryToken,
        newEmail: newEmail.trim().toLowerCase(),
      });

      writeRecoveryState({
        ...state,
        newEmail: newEmail.trim().toLowerCase(),
        devCode: result.devCode,
      });
      setCodeSent(true);

      if (result.devCode) {
        setCode(result.devCode);
        setSuccessMessage(`Email delivery is in development mode. Your code is: ${result.devCode}`);
      } else {
        setSuccessMessage(result.message || 'Verification code sent to your new email.');
      }
      toast.success(result.devCode ? 'Use the on-screen code.' : 'Code sent.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send code.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      setErrorMessage(null);

      if (!state?.recoveryToken) {
        throw new Error('Recovery session missing. Start again.');
      }
      if (!newEmail.trim() || !code.trim()) {
        throw new Error('Enter your new email and verification code.');
      }

      const result = await confirmRecoveryNewEmail({
        recoveryToken: state.recoveryToken,
        newEmail: newEmail.trim().toLowerCase(),
        code: code.trim(),
      });

      clearRecoveryState();
      const message = result.message || 'Email updated successfully.';
      setSuccessMessage(message);
      toast.success(message);

      window.setTimeout(() => {
        router.push(`${paths.auth.signIn}?email=${encodeURIComponent(newEmail.trim().toLowerCase())}`);
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to confirm new email.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  };

  if (!state) {
    return null;
  }

  return (
    <>
      <Logo sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />

      <Typography
        variant="h4"
        sx={{ mb: 1, mt: { xs: 5, md: 8 }, textAlign: { xs: 'center', md: 'left' } }}
      >
        Set a new email
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 4, textAlign: { xs: 'center', md: 'left' } }}
      >
        Enter the email you want to use for this account, then confirm the verification code.
      </Typography>

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}
      {!!successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Stack spacing={3}>
        <TextField
          label="New email address"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          fullWidth
        />
        <LoadingButton
          fullWidth
          size="large"
          variant="outlined"
          loading={sending}
          onClick={handleSendCode}
        >
          Send verification code
        </LoadingButton>

        {codeSent && (
          <>
            <TextField
              label="Verification code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="6-digit code"
              fullWidth
            />
            <LoadingButton
              fullWidth
              size="large"
              color="inherit"
              variant="contained"
              loading={confirming}
              onClick={handleConfirm}
            >
              Confirm new email
            </LoadingButton>
          </>
        )}
      </Stack>

      <Box sx={{ mt: 3 }}>
        <FormReturnLink href={paths.auth.signIn} sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />
      </Box>
    </>
  );
}
