import type { NextRequest } from 'next/server';

import { createPhoneVerificationCode } from '@/models/phone-verification-codes';
import { getUserByEmail, getUserByPhone, normalizePhoneNumber } from '@/models/users';
import {
  getUserSecurityQuestions,
  getSecurityQuestionPrompt,
  getUserSecurityQuestionCount,
} from '@/models/user-security-questions';

import { STATUS, response } from 'src/utils/response';
import { sendPhoneVerificationSms } from 'src/utils/sms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const SAFE_PHONE_MESSAGE =
  'If a verified phone matches, a verification code has been sent.';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const method = String(body?.method || '').trim().toLowerCase();

    if (method === 'phone') {
      const phone = normalizePhoneNumber(String(body?.phone || ''));
      if (!phone) {
        return response({ message: 'Phone number is required.' }, STATUS.BAD_REQUEST);
      }

      const user = await getUserByPhone(phone);
      if (user?.phoneNumber && user.phoneVerifiedAt) {
        const code = generateCode();
        await createPhoneVerificationCode(phone, code, {
          userId: user.id,
          purpose: 'recovery',
        });
        const smsResult = await sendPhoneVerificationSms(phone, code);
        return response(
          {
            message: SAFE_PHONE_MESSAGE,
            method: 'phone',
            ...(smsResult.devMode ? { devCode: code } : {}),
          },
          STATUS.OK,
        );
      }

      return response({ message: SAFE_PHONE_MESSAGE, method: 'phone' }, STATUS.OK);
    }

    if (method === 'questions') {
      const email = String(body?.email || '')
        .trim()
        .toLowerCase();
      if (!email) {
        return response({ message: 'Email is required.' }, STATUS.BAD_REQUEST);
      }

      const user = await getUserByEmail(email);
      const questionCount = user ? await getUserSecurityQuestionCount(user.id) : 0;

      if (!user || questionCount < 3) {
        return response(
          {
            message:
              'If this account has security questions configured, they will appear when available.',
            method: 'questions',
            questions: [],
          },
          STATUS.OK,
        );
      }

      const stored = await getUserSecurityQuestions(user.id);
      const questions = stored.map((row) => ({
        id: row.questionId,
        prompt: getSecurityQuestionPrompt(row.questionId) || row.questionId,
      }));

      return response(
        {
          message: 'Answer your security questions to continue.',
          method: 'questions',
          email,
          questions,
        },
        STATUS.OK,
      );
    }

    return response(
      { message: 'method must be "phone" or "questions".' },
      STATUS.BAD_REQUEST,
    );
  } catch (error) {
    console.error('[Auth - recovery start]: ', error);
    return response({ message: 'Unable to start account recovery.' }, STATUS.ERROR);
  }
}
