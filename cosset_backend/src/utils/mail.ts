import type { NextRequest } from 'next/server';

import type { MailRecipient, UserMailRow } from 'src/models/user-mails';
import { getUserByEmail } from 'src/models/users';

import { JWT_SECRET } from 'src/config-global';
import { verify } from 'src/utils/jwt';

import COLORS from 'src/colors.json';

export type ApiMailLabel = {
  id: string;
  type: string;
  name: string;
  color?: string;
  unreadCount?: number;
};

export const VALID_MAIL_PAPER_STYLES = [
  'classic-lined',
  'plain-cream',
  'parchment',
  'notebook',
  'vintage',
  'blush',
  'sky',
  'mint',
  'lavender',
  'kraft',
  'elegant',
  'dotted',
  'graph',
  'charcoal',
  'watercolor',
] as const;

export type MailPaperStyleId = (typeof VALID_MAIL_PAPER_STYLES)[number];

export const DEFAULT_MAIL_PAPER_STYLE: MailPaperStyleId = 'classic-lined';

export type ApiMail = {
  id: string;
  folder: string;
  subject: string;
  message: string;
  paperStyle: MailPaperStyleId;
  paperBackgroundImage: string | null;
  isUnread: boolean;
  from: {
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  to: MailRecipient[];
  labelIds: string[];
  isStarred: boolean;
  isImportant: boolean;
  createdAt: string | Date;
  attachments: unknown[];
};

export const SYSTEM_MAIL_LABELS: ApiMailLabel[] = [
  { id: 'all', type: 'system', name: 'all', unreadCount: 0 },
  { id: 'inbox', type: 'system', name: 'inbox', unreadCount: 0 },
  { id: 'sent', type: 'system', name: 'sent', unreadCount: 0 },
  { id: 'drafts', type: 'system', name: 'drafts', unreadCount: 0 },
  { id: 'trash', type: 'system', name: 'trash', unreadCount: 0 },
  { id: 'spam', type: 'system', name: 'spam', unreadCount: 0 },
  { id: 'important', type: 'system', name: 'important', unreadCount: 0 },
  { id: 'starred', type: 'system', name: 'starred', unreadCount: 0 },
  { id: 'social', type: 'custom', name: 'social', unreadCount: 0, color: COLORS.primary.main },
  {
    id: 'promotions',
    type: 'custom',
    name: 'promotions',
    unreadCount: 0,
    color: COLORS.warning.main,
  },
  { id: 'forums', type: 'custom', name: 'forums', unreadCount: 0, color: COLORS.error.main },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getUserIdFromMailRequest(req: NextRequest): Promise<string | null> {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];

  try {
    const data = await verify(accessToken, JWT_SECRET);
    return typeof data?.userId === 'string' && data.userId ? data.userId.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function parseRecipientInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeMailCreatedAt(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) {
    return new Date().toISOString();
  }

  if (raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw).toISOString();
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return `${normalized}Z`;
}

export async function buildPhotoByEmailForRows(rows: UserMailRow[]): Promise<Map<string, string>> {
  const emails = new Set<string>();

  rows.forEach((row) => {
    if (row.folder === 'sent') {
      row.toRecipients.forEach((recipient) => {
        const email = recipient.email?.trim().toLowerCase();
        if (email) {
          emails.add(email);
        }
      });
    }
  });

  const photoByEmail = new Map<string, string>();

  await Promise.all(
    [...emails].map(async (email) => {
      const user = await getUserByEmail(email);
      const photo = user?.photoURL != null ? String(user.photoURL).trim() : '';
      if (photo) {
        photoByEmail.set(email, photo);
      }
    }),
  );

  return photoByEmail;
}

export function displayNameFromUser(user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null): string {
  const fromProfile = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fromProfile || user?.email?.split('@')[0] || 'Member';
}

const MAIL_PAPER_COMMENT_RE = /^<!--\s*mail-paper:([\w-]+)\s*-->\s*/i;

export function normalizeMailPaperStyle(value: unknown): MailPaperStyleId {
  const style = typeof value === 'string' ? value.trim() : '';
  if ((VALID_MAIL_PAPER_STYLES as readonly string[]).includes(style)) {
    return style as MailPaperStyleId;
  }
  return DEFAULT_MAIL_PAPER_STYLE;
}

export function stripMailPaperComment(message: string): string {
  return message.replace(MAIL_PAPER_COMMENT_RE, '');
}

export function normalizeMailPaperBackgroundImage(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const key = value.trim();
  if (!key || key.length > 500 || key.includes('..')) {
    return null;
  }

  return key;
}

export function resolveMailPaperStyle(message: string, paperStyle?: string | null): MailPaperStyleId {
  const match = message.match(MAIL_PAPER_COMMENT_RE);
  if (match?.[1]) {
    return normalizeMailPaperStyle(match[1]);
  }

  if (paperStyle && (VALID_MAIL_PAPER_STYLES as readonly string[]).includes(paperStyle.trim())) {
    return paperStyle.trim() as MailPaperStyleId;
  }

  return DEFAULT_MAIL_PAPER_STYLE;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectRecipientSearchText(recipients: MailRecipient[]): string {
  return recipients
    .flatMap((recipient) => [recipient.name, recipient.email])
    .filter(Boolean)
    .join(' ');
}

export function filterMailsBySearchQuery(
  mails: UserMailRow[],
  query?: string | null,
): UserMailRow[] {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) {
    return mails;
  }

  const terms = trimmed.split(/\s+/).filter(Boolean);
  if (!terms.length) {
    return mails;
  }

  return mails.filter((mail) => {
    const haystack = [
      mail.subject,
      mail.fromName,
      mail.fromEmail,
      collectRecipientSearchText(mail.toRecipients),
      collectRecipientSearchText(mail.ccRecipients),
      collectRecipientSearchText(mail.bccRecipients),
      stripHtml(mail.message),
    ]
      .join(' ')
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}

export function filterMailsByLabelId(mails: UserMailRow[], labelId?: string | null): UserMailRow[] {
  switch (labelId) {
    case undefined:
    case 'inbox':
      return mails.filter((mail) => mail.folder === 'inbox');
    case 'all':
      return mails;
    case 'starred':
      return mails.filter((mail) => mail.isStarred);
    case 'important':
      return mails.filter((mail) => mail.isImportant);
    default: {
      const customLabel = SYSTEM_MAIL_LABELS.find((label) => label.id === labelId && label.type === 'custom');
      if (customLabel) {
        return mails.filter((mail) => mail.labelIds.includes(labelId!));
      }
      return mails.filter((mail) => mail.folder === labelId);
    }
  }
}

export function buildMailLabels(mails: UserMailRow[]): ApiMailLabel[] {
  const unreadInbox = mails.filter((mail) => mail.folder === 'inbox' && mail.isUnread).length;
  const unreadSpam = mails.filter((mail) => mail.folder === 'spam' && mail.isUnread).length;
  const unreadImportant = mails.filter((mail) => mail.isImportant && mail.isUnread).length;
  const unreadStarred = mails.filter((mail) => mail.isStarred && mail.isUnread).length;
  const unreadAll = mails.filter((mail) => mail.isUnread).length;

  const customUnread = (labelId: string) =>
    mails.filter((mail) => mail.labelIds.includes(labelId) && mail.isUnread).length;

  return SYSTEM_MAIL_LABELS.map((label) => {
    if (label.id === 'all') {
      return { ...label, unreadCount: unreadAll };
    }
    if (label.id === 'inbox') {
      return { ...label, unreadCount: unreadInbox };
    }
    if (label.id === 'spam') {
      return { ...label, unreadCount: unreadSpam };
    }
    if (label.id === 'important') {
      return { ...label, unreadCount: unreadImportant };
    }
    if (label.id === 'starred') {
      return { ...label, unreadCount: unreadStarred };
    }
    if (label.type === 'custom') {
      return { ...label, unreadCount: customUnread(label.id) };
    }
    return { ...label, unreadCount: 0 };
  });
}

export function mapUserMailToApi(
  row: UserMailRow,
  photoByUserId: Map<string, string>,
  photoByEmail: Map<string, string> = new Map(),
  options?: { forDetails?: boolean },
): ApiMail {
  const fromAvatar =
    row.fromUserId && photoByUserId.has(row.fromUserId.toLowerCase())
      ? photoByUserId.get(row.fromUserId.toLowerCase())!
      : null;

  const actualFrom = {
    name: row.fromName,
    email: row.fromEmail,
    avatarUrl: fromAvatar,
  };

  const firstRecipient = row.toRecipients[0];
  const recipientAvatar =
    firstRecipient?.avatarUrl ||
    (firstRecipient?.email
      ? photoByEmail.get(firstRecipient.email.trim().toLowerCase()) || null
      : null);

  const listFrom =
    !options?.forDetails && row.folder === 'sent' && firstRecipient
      ? {
          name: firstRecipient.name,
          email: firstRecipient.email,
          avatarUrl: recipientAvatar,
        }
      : actualFrom;

  return {
    id: row.id,
    folder: row.folder,
    subject: row.subject,
    message: stripMailPaperComment(row.message),
    paperStyle: resolveMailPaperStyle(row.message, row.paperStyle),
    paperBackgroundImage: row.paperBackgroundImage,
    isUnread: row.isUnread,
    from: listFrom,
    to: row.toRecipients,
    labelIds: row.labelIds,
    isStarred: row.isStarred,
    isImportant: row.isImportant,
    createdAt: serializeMailCreatedAt(row.createdAt),
    attachments: row.attachments as ApiMail['attachments'],
  };
}
