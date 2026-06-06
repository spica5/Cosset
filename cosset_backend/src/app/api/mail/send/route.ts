import type { NextRequest } from 'next/server';

import { sendUserMail } from 'src/utils/email';
import { STATUS, response, handleError } from 'src/utils/response';
import {
  stripHtml,
  isValidEmail,
  displayNameFromUser,
  parseRecipientInput,
  getUserIdFromMailRequest,
} from 'src/utils/mail';

import { createUserMail } from 'src/models/user-mails';
import { getUserById, getUserByEmail } from 'src/models/users';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

async function buildRecipientFromEmail(email: string) {
  const recipient = await getUserByEmail(email);
  const photo = recipient?.photoURL != null ? String(recipient.photoURL).trim() : '';

  return {
    name: recipient ? displayNameFromUser(recipient) : email,
    email,
    avatarUrl: photo || null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromMailRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to send mail' }, STATUS.UNAUTHORIZED);
    }

    const sender = await getUserById(userId);
    if (!sender?.email) {
      return response({ message: 'Sender account not found' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const toEmails = parseRecipientInput(body?.to);
    const ccEmails = parseRecipientInput(body?.cc);
    const bccEmails = parseRecipientInput(body?.bcc);
    const subject = typeof body?.subject === 'string' ? body.subject.trim().slice(0, 500) : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!toEmails.length) {
      return response({ message: 'At least one recipient is required' }, STATUS.BAD_REQUEST);
    }

    if (!message) {
      return response({ message: 'Message is required' }, STATUS.BAD_REQUEST);
    }

    const allEmails = [...toEmails, ...ccEmails, ...bccEmails];
    const invalidEmail = allEmails.find((email) => !isValidEmail(email));
    if (invalidEmail) {
      return response({ message: `Invalid email address: ${invalidEmail}` }, STATUS.BAD_REQUEST);
    }

    const senderName = displayNameFromUser(sender);
    const senderEmail = sender.email.trim();
    const toRecipients = await Promise.all(toEmails.map((email) => buildRecipientFromEmail(email)));
    const ccRecipients = await Promise.all(ccEmails.map((email) => buildRecipientFromEmail(email)));
    const bccRecipients = await Promise.all(bccEmails.map((email) => buildRecipientFromEmail(email)));
    const plainText = stripHtml(message);
    const deliveryErrors: string[] = [];
    let externalDeliveries = 0;

    const sentMail = await createUserMail({
      ownerUserId: userId,
      folder: 'sent',
      fromUserId: userId,
      fromName: senderName,
      fromEmail: senderEmail,
      toRecipients,
      ccRecipients,
      bccRecipients,
      subject,
      message,
      isUnread: false,
    });

    const toRecipientUsers = await Promise.all(
      toEmails.map(async (email) => ({
        email,
        recipient: await getUserByEmail(email),
      })),
    );

    const inboxRecipients = new Map<
      string,
      { name: string; email: string; avatarUrl: string | null }
    >();

    toRecipientUsers.forEach(({ email, recipient }) => {
      if (!recipient?.id) {
        return;
      }

      const recipientId = recipient.id.trim().toLowerCase();
      if (recipientId === userId) {
        return;
      }

      const photo = recipient.photoURL != null ? String(recipient.photoURL).trim() : '';
      inboxRecipients.set(recipientId, {
        name: displayNameFromUser(recipient),
        email: recipient.email?.trim() || email,
        avatarUrl: photo || null,
      });
    });

    await Promise.all(
      [...inboxRecipients.entries()].map(([recipientId, recipient]) =>
        createUserMail({
          ownerUserId: recipientId,
          folder: 'inbox',
          fromUserId: userId,
          fromName: senderName,
          fromEmail: senderEmail,
          toRecipients: [
            {
              name: recipient.name,
              email: recipient.email,
              avatarUrl: recipient.avatarUrl,
            },
          ],
          ccRecipients,
          bccRecipients,
          subject,
          message,
          isUnread: true,
        }),
      ),
    );

    const deliveryResults = await Promise.all(
      allEmails.map(async (email) => {
        try {
          const result = await sendUserMail({
            to: email,
            subject: subject || '(No subject)',
            text: plainText,
            html: message,
          });
          return { email, result, error: null as string | null };
        } catch (error) {
          return {
            email,
            result: null,
            error: error instanceof Error ? error.message : 'Failed to deliver email',
          };
        }
      }),
    );

    deliveryResults.forEach(({ email, result, error }) => {
      if (result?.sent) {
        externalDeliveries += 1;
      } else if (result?.error) {
        deliveryErrors.push(`${email}: ${result.error}`);
      } else if (error) {
        deliveryErrors.push(`${email}: ${error}`);
      }
    });

    const inAppDeliveries = inboxRecipients.size;
    let responseMessage = 'Message sent';

    if (externalDeliveries > 0 && deliveryErrors.length === 0) {
      responseMessage = 'Message sent';
    } else if (inAppDeliveries > 0 && deliveryErrors.length > 0) {
      responseMessage =
        'Message saved in Cosset mail. External email delivery failed for some recipients.';
    } else if (inAppDeliveries > 0) {
      responseMessage = 'Message delivered in Cosset mail';
    } else if (deliveryErrors.length > 0) {
      responseMessage = 'Message saved to Sent, but external email delivery failed';
    }

    return response(
      {
        message: responseMessage,
        mailId: sentMail.id,
        inAppDeliveries,
        externalDeliveries,
        deliveryErrors: deliveryErrors.length ? deliveryErrors : undefined,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Mail - Send', error as Error);
  }
}
