'use client';

import { useEffect, useMemo, useState } from 'react';
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

import { verifyRecoveryPhone, verifyRecoveryQuestions } from 'src/auth/context/jwt';
import {
  readRecoveryState,
  writeRecoveryState,
  type StoredRecoveryState,
} from 'src/auth/utils/recovery-storage';

import { FormReturnLink } from './components/form-return-link';

// ----------------------------------------------------------------------

export function RecoverVerifyView() {
  const router = useRouter();
  const [state, setState] = useState<StoredRecoveryState | null>(null);
  const [code, setCode] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = readRecoveryState();
    if (!stored?.method) {
      router.replace(paths.auth.recoverAccount);
      return;
    }
    setState(stored);
    if (stored.devCode) {
      setCode(stored.devCode);
    }
  }, [router]);

  const questions = useMemo(() => state?.questions || [], [state]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (!state) {
        throw new Error('Recovery session missing. Start again.');
      }

      if (state.method === 'phone') {
        if (!state.phone || !code.trim()) {
          throw new Error('Enter the verification code sent to your phone.');
        }
        const result = await verifyRecoveryPhone({ phone: state.phone, code: code.trim() });
        writeRecoveryState({ ...state, recoveryToken: result.recoveryToken, devCode: undefined });
        toast.success(result.message || 'Identity verified.');
        router.push(paths.auth.recoverNewEmail);
        return;
      }

      const answerList = questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] || '',
      }));

      if (answerList.some((item) => !item.answer.trim()) || answerList.length < 3) {
        throw new Error('Answer at least 3 security questions.');
      }

      const result = await verifyRecoveryQuestions({
        email: String(state.email || ''),
        answers: answerList,
      });
      writeRecoveryState({ ...state, recoveryToken: result.recoveryToken });
      toast.success(result.message || 'Identity verified.');
      router.push(paths.auth.recoverNewEmail);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify identity.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
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
        Verify identity
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 4, textAlign: { xs: 'center', md: 'left' } }}
      >
        {state.method === 'phone'
          ? 'Enter the code sent to your phone.'
          : 'Answer your security questions to continue.'}
      </Typography>

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}
      {!!state.devCode && state.method === 'phone' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          SMS is not configured. Your code is: {state.devCode}
        </Alert>
      )}

      <Stack spacing={3}>
        {state.method === 'phone' ? (
          <TextField
            label="Verification code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="6-digit code"
            fullWidth
          />
        ) : (
          questions.map((question) => (
            <TextField
              key={question.id}
              label={question.prompt}
              value={answers[question.id] || ''}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
              }
              fullWidth
            />
          ))
        )}

        <LoadingButton
          fullWidth
          size="large"
          variant="contained"
          color="inherit"
          loading={loading}
          onClick={handleSubmit}
        >
          Continue
        </LoadingButton>
      </Stack>

      <Box sx={{ mt: 3 }}>
        <FormReturnLink
          href={paths.auth.recoverAccount}
          label="Back to recovery options"
          sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }}
        />
      </Box>
    </>
  );
}
