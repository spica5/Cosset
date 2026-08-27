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
  role?: 'user' | 'business';
};

export type SignUpResult = {
  requiresVerification: boolean;
  email: string;
  message?: string;
  devCode?: string;
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

function getErrorPayload(error: unknown): Record<string, any> | null {
  if (error && typeof error === 'object') {
    return error as Record<string, any>;
  }
  return null;
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

    const payload = getErrorPayload(error);
    if (payload?.requiresVerification) {
      const verificationError = new Error(
        String(payload.message || 'Please verify your email before signing in.'),
      ) as Error & { requiresVerification?: boolean; email?: string };
      verificationError.requiresVerification = true;
      verificationError.email = String(payload.email || email);
      throw verificationError;
    }

    throw new Error(getSignInErrorMessage(error));
  }
};

function getSignInErrorMessage(error: unknown) {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) {
      return message;
    }
  }

  return 'Unable to sign in.';
}

/** **************************************
 * Sign up
 *************************************** */
export const signUp = async ({
  email,
  password,
  firstName,
  lastName,
  role = 'user',
}: SignUpParams): Promise<SignUpResult> => {
  const params = {
    email,
    password,
    firstName,
    lastName,
    role: role === 'business' ? 'business' : 'user',
  };

  try {
    const res = await axios.post(endpoints.auth.signUp, params);
    const data = res.data || {};

    // Email/password signup requires verification; do not expect an access token here.
    return {
      requiresVerification: Boolean(data.requiresVerification ?? true),
      email: String(data.email || email).trim().toLowerCase(),
      message: data.message,
      devCode: data.devCode,
    };
  } catch (error) {
    console.error('Error during sign up:', error);
    const payload = getErrorPayload(error);
    const message =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : String(payload?.message || 'Unable to create account. Please try again.');
    throw new Error(message);
  }
};

export type VerifyEmailParams = {
  email: string;
  code: string;
};

export type ResendVerificationParams = {
  email: string;
};

export type ResendVerificationResult = {
  message?: string;
  devCode?: string;
};

/** **************************************
 * Verify email
 *************************************** */
export const verifyEmail = async ({ email, code }: VerifyEmailParams): Promise<void> => {
  try {
    const res = await axios.post(endpoints.auth.verifyEmail, { email, code });
    const { accessToken, user } = res.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    if (user) {
      assertCustomerCanSignIn(user);
    }

    await setSession(accessToken);
  } catch (error) {
    await setSession(null);
    console.error('Error during email verification:', error);
    throw error;
  }
};

/** **************************************
 * Resend verification
 *************************************** */
export const resendEmailVerification = async ({
  email,
}: ResendVerificationParams): Promise<ResendVerificationResult> => {
  try {
    const res = await axios.post(endpoints.auth.resendVerification, { email });
    return res.data as ResendVerificationResult;
  } catch (error) {
    console.error('Error during resend verification:', error);
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
    const message =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message || 'Unable to reset password.')
            : 'Unable to reset password.';
    throw new Error(message);
  }
};

export type ChangePasswordParams = {
  currentPassword: string;
  newPassword: string;
};

/** **************************************
 * Change password (authenticated)
 *************************************** */
export const changePassword = async ({
  currentPassword,
  newPassword,
}: ChangePasswordParams): Promise<{ message?: string }> => {
  try {
    const res = await axios.post(endpoints.auth.changePassword, {
      currentPassword,
      newPassword,
    });
    return res.data;
  } catch (error) {
    console.error('Error during password change:', error);
    throw new Error(getAuthApiErrorMessage(error, 'Unable to change password.'));
  }
};

/** **************************************
 * Account recovery (lost email)
 *************************************** */

function getAuthApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) {
      return message;
    }
  }
  return fallback;
}

export type RecoveryStatus = {
  phoneNumber?: string | null;
  phoneMasked?: string | null;
  phoneVerified: boolean;
  questionsConfigured: boolean;
  questionCount: number;
  questionIds?: string[];
};

export async function getRecoveryStatus(): Promise<RecoveryStatus> {
  try {
    const res = await axios.get(endpoints.auth.recovery.status);
    return res.data as RecoveryStatus;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to load recovery status.'));
  }
}

export async function getSecurityQuestionsCatalog(): Promise<
  Array<{ id: string; prompt: string }>
> {
  try {
    const res = await axios.get(endpoints.auth.recovery.securityQuestionsCatalog);
    return (res.data?.questions || []) as Array<{ id: string; prompt: string }>;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to load security questions.'));
  }
}

export async function sendRecoveryPhoneSetupCode(phone?: string): Promise<{
  message?: string;
  phone?: string;
  devCode?: string;
}> {
  try {
    const res = await axios.post(endpoints.auth.recovery.phoneSendCode, { phone });
    return res.data;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to send phone code.'));
  }
}

export async function verifyRecoveryPhoneSetup(params: {
  phone?: string;
  code: string;
}): Promise<{ message?: string; phoneVerified?: boolean }> {
  try {
    const res = await axios.post(endpoints.auth.recovery.phoneVerify, params);
    return res.data;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to verify phone.'));
  }
}

export async function saveSecurityQuestions(
  questions: Array<{ questionId: string; answer: string }>,
): Promise<{ message?: string }> {
  try {
    const res = await axios.put(endpoints.auth.recovery.securityQuestions, { questions });
    return res.data;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to save security questions.'));
  }
}

export async function startAccountRecovery(params: {
  method: 'phone' | 'questions';
  phone?: string;
  email?: string;
}): Promise<{
  message?: string;
  method?: string;
  email?: string;
  questions?: Array<{ id: string; prompt: string }>;
  devCode?: string;
}> {
  try {
    const res = await axios.post(endpoints.auth.recovery.start, params);
    return res.data;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to start recovery.'));
  }
}

export async function verifyRecoveryPhone(params: {
  phone: string;
  code: string;
}): Promise<{ recoveryToken: string; message?: string }> {
  try {
    const res = await axios.post(endpoints.auth.recovery.verifyPhone, params);
    return res.data;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to verify phone recovery.'));
  }
}

export async function verifyRecoveryQuestions(params: {
  email: string;
  answers: Array<{ questionId: string; answer: string }>;
}): Promise<{ recoveryToken: string; message?: string }> {
  try {
    const res = await axios.post(endpoints.auth.recovery.verifyQuestions, params);
    return res.data;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to verify security answers.'));
  }
}

export async function requestRecoveryNewEmail(params: {
  recoveryToken: string;
  newEmail: string;
}): Promise<{ message?: string; newEmail?: string; devCode?: string }> {
  try {
    const res = await axios.post(endpoints.auth.recovery.requestNewEmail, params);
    return res.data;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to request new email verification.'));
  }
}

export async function confirmRecoveryNewEmail(params: {
  recoveryToken: string;
  newEmail: string;
  code: string;
}): Promise<{ message?: string; email?: string }> {
  try {
    const res = await axios.post(endpoints.auth.recovery.confirmNewEmail, params);
    return res.data;
  } catch (error) {
    throw new Error(getAuthApiErrorMessage(error, 'Unable to confirm new email.'));
  }
}

/** **************************************
 * Sign in with Google
 *************************************** */
export const signInWithGoogle = async (
  token: string,
  kind: 'idToken' | 'accessToken' = 'idToken',
): Promise<void> => {
  try {
    const payload =
      kind === 'accessToken' ? { accessToken: token } : { idToken: token };

    const res = await axios.post(endpoints.auth.google, payload);

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
    console.error('Error during Google sign in:', error);
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
