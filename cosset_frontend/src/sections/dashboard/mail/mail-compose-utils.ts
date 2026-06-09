import type { IMail } from 'src/types/mail';

import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export function buildReplySubject(subject: string): string {
  const trimmed = subject.trim() || '(No subject)';
  if (/^re:/i.test(trimmed)) {
    return trimmed;
  }
  return `Re: ${trimmed}`;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function getReplyRecipient(mail: IMail, userEmail?: string): string {
  const myEmail = userEmail ? normalizeEmail(userEmail) : '';

  if (mail.folder === 'sent') {
    const recipient = mail.to.find((person) => normalizeEmail(person.email) !== myEmail);
    return recipient?.email || mail.to[0]?.email || '';
  }

  return mail.from.email;
}

export function buildQuotedMessage(mail: IMail): string {
  const date = fDateTime(mail.createdAt);
  const fromLine = `${mail.from.name} &lt;${mail.from.email}&gt;`;

  return `<p></p><p>---</p><p>On ${date}, ${fromLine} wrote:</p><blockquote>${mail.message}</blockquote>`;
}
