'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LoadingButton from '@mui/lab/LoadingButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Logo } from 'src/components/universe/logo';

import { startAccountRecovery } from 'src/auth/context/jwt';
import { writeRecoveryState } from 'src/auth/utils/recovery-storage';

import { FormReturnLink } from './components/form-return-link';

// ----------------------------------------------------------------------

export function RecoverAccountView() {
  const router = useRouter();
  const [method, setMethod] = useState<'phone' | 'questions'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (method === 'phone') {
        if (!phone.trim()) {
          throw new Error('Enter the phone number on your account.');
        }

        const result = await startAccountRecovery({ method: 'phone', phone: phone.trim() });
        writeRecoveryState({
          method: 'phone',
          phone: phone.trim(),
          devCode: result.devCode,
        });

        if (result.devCode) {
          setSuccessMessage(`SMS is not configured. Your code is: ${result.devCode}`);
        } else {
          setSuccessMessage(result.message || 'If the phone matches, a code was sent.');
        }

        router.push(paths.auth.recoverVerify);
        return;
      }

      if (!email.trim()) {
        throw new Error('Enter the email currently on your account.');
      }

      const result = await startAccountRecovery({
        method: 'questions',
        email: email.trim().toLowerCase(),
      });

      if (!result.questions?.length) {
        throw new Error(
          'No security questions are set for this account. Use phone recovery or contact support.',
        );
      }

      writeRecoveryState({
        method: 'questions',
        email: email.trim().toLowerCase(),
        questions: result.questions,
      });

      router.push(paths.auth.recoverVerify);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start recovery.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Logo sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />

      <Typography
        variant="h4"
        sx={{ mb: 1, mt: { xs: 5, md: 8 }, textAlign: { xs: 'center', md: 'left' } }}
      >
        Recover account
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 4, textAlign: { xs: 'center', md: 'left' } }}
      >
        Lost access to your email? Verify with your phone or security questions, then set a new
        email.
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
        <ToggleButtonGroup
          exclusive
          fullWidth
          color="primary"
          value={method}
          onChange={(_event, value: 'phone' | 'questions' | null) => {
            if (value) {
              setMethod(value);
            }
          }}
        >
          <ToggleButton value="phone">Phone</ToggleButton>
          <ToggleButton value="questions">Security questions</ToggleButton>
        </ToggleButtonGroup>

        {method === 'phone' ? (
          <TextField
            label="Phone number"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+1 555 123 4567"
            fullWidth
          />
        ) : (
          <TextField
            label="Current account email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            fullWidth
          />
        )}

        <LoadingButton
          fullWidth
          size="large"
          variant="contained"
          color="inherit"
          loading={loading}
          onClick={handleContinue}
        >
          Continue
        </LoadingButton>
      </Stack>

      <Box sx={{ mt: 3 }}>
        <FormReturnLink href={paths.auth.signIn} sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />
      </Box>
    </>
  );
}
