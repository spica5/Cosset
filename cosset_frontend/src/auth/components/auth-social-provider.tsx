'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

import { CONFIG } from 'src/config-global';

type Props = {
  children: React.ReactNode;
};

export function AuthSocialProvider({ children }: Props) {
  const clientId = CONFIG.googleClientId.trim();

  if (!clientId) {
    return children;
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
