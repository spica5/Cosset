'use client';

import axios, { endpoints } from 'src/lib/axios';

import { setSession } from './utils';

// ----------------------------------------------------------------------

export type SignInParams = {
  email: string;
  password: string;
};

function isAdminUser(user: Record<string, unknown> | null | undefined) {
  return String(user?.role || '')
    .trim()
    .toLowerCase() === 'admin';
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Unable to sign in. Please try again.';
}

/** **************************************
 * Sign in (admin accounts from cosset_users)
 *************************************** */
export const signInWithPassword = async ({ email, password }: SignInParams): Promise<void> => {
  try {
    const params = { email, password };

    const res = await axios.post(endpoints.auth.signIn, params);

    const { accessToken, user } = res.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    if (!isAdminUser(user)) {
      await setSession(null);
      throw new Error('Cosset CRM is available to admin accounts only.');
    }

    await setSession(accessToken);
  } catch (error) {
    await setSession(null);
    console.error('Error during sign in:', error);
    throw new Error(getErrorMessage(error));
  }
};

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

/** **************************************
 * Sign up — disabled for CRM (admin-only)
 *************************************** */
export const signUp = async (_params: SignUpParams): Promise<void> => {
  throw new Error('Cosset CRM does not support self sign-up. Sign in with an admin account.');
};

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async (): Promise<void> => {
  try {
    await setSession(null);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
