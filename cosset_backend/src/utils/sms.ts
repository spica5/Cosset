export type SmsSendResult = {
  sent: boolean;
  /** True when SMS could not be delivered externally. */
  devMode?: boolean;
  error?: string;
};

function trimEnv(value?: string): string {
  return value?.trim().replace(/^['"]|['"]$/g, '') || '';
}

function isTwilioConfigured(): boolean {
  return Boolean(
    trimEnv(process.env.TWILIO_ACCOUNT_SID) &&
      trimEnv(process.env.TWILIO_AUTH_TOKEN) &&
      trimEnv(process.env.TWILIO_FROM_NUMBER),
  );
}

/**
 * Send an SMS message. Until Twilio env vars are configured, returns devMode
 * so callers can expose the OTP on-screen (same pattern as email).
 */
export async function sendSms(phone: string, message: string): Promise<SmsSendResult> {
  if (!isTwilioConfigured()) {
    console.info(`[SMS Dev] To ${phone}: ${message}`);
    return { sent: false, devMode: true };
  }

  try {
    const accountSid = trimEnv(process.env.TWILIO_ACCOUNT_SID);
    const authToken = trimEnv(process.env.TWILIO_AUTH_TOKEN);
    const from = trimEnv(process.env.TWILIO_FROM_NUMBER);

    const body = new URLSearchParams({
      To: phone,
      From: from,
      Body: message,
    });

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('[SMS] Twilio failed:', text);
      return { sent: false, devMode: true, error: text };
    }

    return { sent: true };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'SMS send failed';
    console.error('[SMS] Failed:', error);
    return { sent: false, devMode: true, error: messageText };
  }
}

export async function sendPhoneVerificationSms(
  phone: string,
  code: string,
): Promise<SmsSendResult> {
  return sendSms(phone, `Your Cosset verification code is: ${code}. It expires in 15 minutes.`);
}
