'use client';

import { toast } from 'sonner';
import { useGoogleLogin } from '@react-oauth/google';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

import { CONFIG } from 'src/config-global';
import { GoogleIcon } from 'src/assets/dashboard/icons';

type Props = {
  onCredential: (token: string, kind?: 'idToken' | 'accessToken') => void | Promise<void>;
  disabled?: boolean;
  variant?: 'dashboard' | 'universe';
};

const GOOGLE_NOT_CONFIGURED_MESSAGE =
  'Google sign-in is not configured yet. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in the frontend env and GOOGLE_CLIENT_ID on the backend.';

function GoogleIconMark({ variant }: { variant: 'dashboard' | 'universe' }) {
  if (variant === 'universe') {
    return (
      <Box
        component="img"
        alt="Google"
        src={`${CONFIG.universe.assetsDir}/assets/icons/socials/ic-google.svg`}
        sx={{ width: 20, height: 20 }}
      />
    );
  }

  return <GoogleIcon width={22} />;
}

function ConfiguredGoogleSignInButton({
  onCredential,
  disabled = false,
  variant = 'dashboard',
}: Props) {
  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    scope: 'openid email profile',
    onSuccess: (tokenResponse) => {
      const accessToken = String(tokenResponse.access_token || '').trim();
      if (!accessToken) {
        toast.error('Google did not return an access token. Please try again.');
        return;
      }
      Promise.resolve(onCredential(accessToken, 'accessToken')).catch((error) => {
        console.error(error);
      });
    },
    onError: () => {
      toast.error('Google sign-in failed. Please try again.');
    },
  });

  return (
    <IconButton
      color="inherit"
      disabled={disabled}
      onClick={() => googleLogin()}
      aria-label="Sign in with Google"
      sx={{ width: 40, height: 40 }}
    >
      <GoogleIconMark variant={variant} />
    </IconButton>
  );
}

export function GoogleSignInButton({
  onCredential,
  disabled = false,
  variant = 'dashboard',
}: Props) {
  const isConfigured = Boolean(CONFIG.googleClientId.trim());

  if (!isConfigured) {
    return (
      <IconButton
        color="inherit"
        disabled={disabled}
        onClick={() => toast.error(GOOGLE_NOT_CONFIGURED_MESSAGE)}
        aria-label="Sign in with Google"
        sx={{ width: 40, height: 40 }}
      >
        <GoogleIconMark variant={variant} />
      </IconButton>
    );
  }

  return (
    <ConfiguredGoogleSignInButton
      onCredential={onCredential}
      disabled={disabled}
      variant={variant}
    />
  );
}
