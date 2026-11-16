'use client';

import { useMemo, useState, useEffect } from 'react';

import { getS3SignedUrl } from 'src/actions/user';

import { useAuthContext } from './use-auth-context';

// ----------------------------------------------------------------------

function getDisplayName(user: Record<string, any> | null | undefined) {
  if (!user) return 'User';

  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    'User'
  );
}

function getPhotoKey(user: Record<string, any> | null | undefined) {
  if (!user) return '';
  return String(user.photoURL || user.avatarUrl || user.avatar || '').trim();
}

export function useAuthUserProfile() {
  const { user } = useAuthContext();
  const [photoURL, setPhotoURL] = useState('');

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const email = String(user?.email || '');
  const role = String(user?.role || 'admin');
  const plan = String(user?.plan || 'FREE');
  const photoKey = getPhotoKey(user);

  useEffect(() => {
    let mounted = true;

    const resolvePhoto = async () => {
      if (!photoKey) {
        if (mounted) setPhotoURL('');
        return;
      }

      const normalized = photoKey.replace(/^public:/, '');

      if (
        normalized.startsWith('http://') ||
        normalized.startsWith('https://') ||
        normalized.startsWith('data:') ||
        normalized.startsWith('blob:')
      ) {
        if (mounted) setPhotoURL(normalized);
        return;
      }

      const signedUrl = await getS3SignedUrl(normalized);
      if (mounted) setPhotoURL(signedUrl || '');
    };

    resolvePhoto();

    return () => {
      mounted = false;
    };
  }, [photoKey]);

  return {
    user,
    displayName,
    email,
    role,
    plan,
    photoURL,
  };
}
