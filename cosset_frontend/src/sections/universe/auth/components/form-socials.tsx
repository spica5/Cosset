'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';

import { GoogleSignInButton } from 'src/auth/components/google-sign-in-button';

// ----------------------------------------------------------------------

type FormSocialsProps = {
  sx?: SxProps<Theme>;
  onGoogleCredential?: (token: string, kind?: 'idToken' | 'accessToken') => void | Promise<void>;
  googleSignInLoading?: boolean;
};

export function FormSocials({
  sx,
  onGoogleCredential,
  googleSignInLoading = false,
}: FormSocialsProps) {
  return (
    <Box gap={1.5} display="flex" justifyContent="center" alignItems="center" sx={sx}>
      <GoogleSignInButton
        onCredential={onGoogleCredential || (() => undefined)}
        disabled={googleSignInLoading || !onGoogleCredential}
        variant="universe"
      />
    </Box>
  );
}
