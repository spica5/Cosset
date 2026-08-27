'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/dashboard/snackbar';

import {
  getRecoveryStatus,
  getSecurityQuestionsCatalog,
  saveSecurityQuestions,
  sendRecoveryPhoneSetupCode,
  verifyRecoveryPhoneSetup,
  type RecoveryStatus,
} from 'src/auth/context/jwt/action';

// ----------------------------------------------------------------------

type QuestionDraft = {
  questionId: string;
  answer: string;
};

const EMPTY_DRAFTS: QuestionDraft[] = [
  { questionId: '', answer: '' },
  { questionId: '', answer: '' },
  { questionId: '', answer: '' },
];

export function AccountRecoveryCard() {
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [catalog, setCatalog] = useState<Array<{ id: string; prompt: string }>>([]);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<QuestionDraft[]>(EMPTY_DRAFTS);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const [nextStatus, nextCatalog] = await Promise.all([
        getRecoveryStatus(),
        getSecurityQuestionsCatalog(),
      ]);
      setStatus(nextStatus);
      setCatalog(nextCatalog);
      setPhone(nextStatus.phoneNumber || '');
      if (nextStatus.questionIds?.length) {
        setDrafts(
          nextStatus.questionIds.slice(0, 3).map((questionId) => ({
            questionId,
            answer: '',
          })),
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load recovery settings.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableOptions = useMemo(() => {
    const selected = new Set(drafts.map((d) => d.questionId).filter(Boolean));
    return catalog.map((item) => ({
      ...item,
      disabled: selected.has(item.id),
    }));
  }, [catalog, drafts]);

  const handleSendCode = async () => {
    try {
      setSendingCode(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setDevCode(null);
      const result = await sendRecoveryPhoneSetupCode(phone);
      if (result.phone) {
        setPhone(result.phone);
      }
      if (result.devCode) {
        setDevCode(result.devCode);
        setSuccessMessage(`SMS is not configured. Your code is: ${result.devCode}`);
      } else {
        setSuccessMessage(result.message || 'Verification code sent.');
      }
      toast.success(result.devCode ? 'Use the on-screen code to verify your phone.' : 'Code sent.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send code.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyPhone = async () => {
    try {
      setVerifyingPhone(true);
      setErrorMessage(null);
      const result = await verifyRecoveryPhoneSetup({ phone, code: phoneCode });
      setSuccessMessage(result.message || 'Phone verified.');
      toast.success(result.message || 'Phone verified.');
      setPhoneCode('');
      setDevCode(null);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify phone.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleSaveQuestions = async () => {
    try {
      setSavingQuestions(true);
      setErrorMessage(null);
      const questions = drafts.filter((d) => d.questionId && d.answer.trim());
      if (questions.length < 3) {
        throw new Error('Select and answer at least 3 security questions.');
      }
      const result = await saveSecurityQuestions(questions);
      setSuccessMessage(result.message || 'Security questions saved.');
      toast.success(result.message || 'Security questions saved.');
      setDrafts((prev) => prev.map((d) => ({ ...d, answer: '' })));
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save questions.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSavingQuestions(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Account recovery
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a verified phone number or at least 3 security questions so you can replace your
              email if you lose access to it.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color={status?.phoneVerified ? 'success' : 'default'}
              label={status?.phoneVerified ? 'Phone verified' : 'Phone not verified'}
              variant={status?.phoneVerified ? 'filled' : 'outlined'}
            />
            <Chip
              size="small"
              color={status?.questionsConfigured ? 'success' : 'default'}
              label={
                status?.questionsConfigured
                  ? `Security questions ready (${status.questionCount})`
                  : 'Security questions not set'
              }
              variant={status?.questionsConfigured ? 'filled' : 'outlined'}
            />
          </Stack>

          {!!errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {!!successMessage && <Alert severity="success">{successMessage}</Alert>}
          {!!devCode && !successMessage && (
            <Alert severity="info">Dev code: {devCode}</Alert>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Verified phone
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Phone number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 123 4567"
                disabled={loadingStatus}
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <LoadingButton
                  variant="outlined"
                  onClick={handleSendCode}
                  loading={sendingCode}
                  disabled={!phone.trim()}
                >
                  Send code
                </LoadingButton>
                <TextField
                  label="Verification code"
                  value={phoneCode}
                  onChange={(event) => setPhoneCode(event.target.value)}
                  placeholder="6-digit code"
                  sx={{ flex: 1 }}
                />
                <LoadingButton
                  variant="contained"
                  onClick={handleVerifyPhone}
                  loading={verifyingPhone}
                  disabled={!phoneCode.trim()}
                >
                  Verify phone
                </LoadingButton>
              </Stack>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Security questions
            </Typography>
            <Stack spacing={2}>
              {drafts.map((draft, index) => (
                <Stack key={`question-${index}`} spacing={1.5}>
                  <TextField
                    select
                    label={`Question ${index + 1}`}
                    value={draft.questionId}
                    onChange={(event) => {
                      const questionId = event.target.value;
                      setDrafts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, questionId } : item)),
                      );
                    }}
                    fullWidth
                  >
                    <MenuItem value="">
                      <em>Select a question</em>
                    </MenuItem>
                    {availableOptions.map((option) => (
                      <MenuItem
                        key={option.id}
                        value={option.id}
                        disabled={option.disabled && option.id !== draft.questionId}
                      >
                        {option.prompt}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={`Answer ${index + 1}`}
                    value={draft.answer}
                    onChange={(event) => {
                      const answer = event.target.value;
                      setDrafts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, answer } : item)),
                      );
                    }}
                    fullWidth
                  />
                </Stack>
              ))}
              <LoadingButton
                variant="contained"
                onClick={handleSaveQuestions}
                loading={savingQuestions}
                sx={{ alignSelf: 'flex-start' }}
              >
                Save security questions
              </LoadingButton>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
