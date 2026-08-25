'use client';

import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';

import { GoogleSignInButton } from './google-sign-in-button';

// ----------------------------------------------------------------------

type FormSocialsProps = BoxProps & {
  onGoogleCredential?: (token: string, kind?: 'idToken' | 'accessToken') => void | Promise<void>;
  googleSignInLoading?: boolean;
};

export function FormSocials({
  sx,
  onGoogleCredential,
  googleSignInLoading = false,
  ...other
}: FormSocialsProps) {
  return (
    <Box gap={1.5} display="flex" justifyContent="center" alignItems="center" sx={sx} {...other}>
      <GoogleSignInButton
        onCredential={onGoogleCredential || (() => undefined)}
        disabled={googleSignInLoading || !onGoogleCredential}
        variant="dashboard"
      />
    </Box>
  );
}
