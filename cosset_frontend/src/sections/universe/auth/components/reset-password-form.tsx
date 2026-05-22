import type { Theme, SxProps } from '@mui/material/styles';

import { useFormContext } from 'react-hook-form';

import Stack from '@mui/material/Stack';
import LoadingButton from '@mui/lab/LoadingButton';

import { Field } from 'src/components/universe/hook-form';

// ----------------------------------------------------------------------

type ResetPasswordFormProps = {
  sx?: SxProps<Theme>;
};

export function ResetPasswordForm({ sx }: ResetPasswordFormProps) {
  const {
    formState: { isSubmitting },
  } = useFormContext();

  return (
    <Stack spacing={3} sx={sx}>
      <Field.Text name="email" label="Email address" InputLabelProps={{ shrink: true }} />

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
      >
        Send request
      </LoadingButton>
    </Stack>
  );
}
