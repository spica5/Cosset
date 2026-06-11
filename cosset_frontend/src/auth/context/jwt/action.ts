'use client';

import axios, { endpoints } from 'src/utils/axios';

import { setSession } from './utils';

// ----------------------------------------------------------------------

export type SignInParams = {
  email: string;
  password: string;
};

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

const INACTIVE_CUSTOMER_MESSAGE = "Your account isn't active and can't log in. Please contact support.";

function getCustomerState(user: Record<string, any> | null | undefined) {
  return String(user?.state || user?.status || 'active').trim().toLowerCase();
}

function assertCustomerCanSignIn(user: Record<string, any> | null | undefined) {
  if (getCustomerState(user) !== 'active') {
    throw new Error(INACTIVE_CUSTOMER_MESSAGE);
  }
}

/** **************************************
 * Sign in
 *************************************** */
export const signInWithPassword = async ({ email, password }: SignInParams): Promise<void> => {
  try {
    const params = { email, password };

    const res = await axios.post(endpoints.auth.signIn, params);

    const { accessToken, user } = res.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    if (user) {
      assertCustomerCanSignIn(user);
    } else {
      const meRes = await axios.get(endpoints.auth.me, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assertCustomerCanSignIn(meRes.data?.user);
    }

    await setSession(accessToken);
  } catch (error) {
    await setSession(null);
    console.error('Error during sign in:', error);
    throw error;
  }
};

/** **************************************
 * Sign up
 *************************************** */
export const signUp = async ({
  email,
  password,
  firstName,
  lastName,
}: SignUpParams): Promise<void> => {
  const params = {
    email,
    password,
    firstName,
    lastName,
  };

  try {
    const res = await axios.post(endpoints.auth.signUp, params);

    const { accessToken } = res.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    await setSession(accessToken);
  } catch (error) {
    console.error('Error during sign up:', error);
    throw error;
  }
};

export type ForgotPasswordParams = {
  email: string;
};

export type ForgotPasswordResult = {
  message?: string;
  devCode?: string;
};

export type ResetPasswordParams = {
  email: string;
  code: string;
  password: string;
};

/** **************************************
 * Forgot password
 *************************************** */
export const requestPasswordReset = async ({
  email,
}: ForgotPasswordParams): Promise<ForgotPasswordResult> => {
  try {
    const res = await axios.post(endpoints.auth.forgotPassword, { email });
    return res.data as ForgotPasswordResult;
  } catch (error) {
    console.error('Error during password reset request:', error);
    throw error;
  }
};

/** **************************************
 * Reset password
 *************************************** */
export const resetPassword = async ({
  email,
  code,
  password,
}: ResetPasswordParams): Promise<void> => {
  try {
    await axios.post(endpoints.auth.resetPassword, { email, code, password });
  } catch (error) {
    console.error('Error during password reset:', error);
    throw error;
  }
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
