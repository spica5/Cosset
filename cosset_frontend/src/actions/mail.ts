import type { IMail, IMailLabel } from 'src/types/mail';

import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';

import { keyBy } from 'src/utils/helper';
import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const mailUnreadPollOptions = {
  ...swrOptions,
  refreshInterval: 30_000,
};

// ----------------------------------------------------------------------

type LabelsData = {
  labels: IMailLabel[];
};

export function useGetLabels() {
  const url = endpoints.mail.labels;

  const { data, isLoading, error, isValidating } = useSWR<LabelsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      labels: data?.labels || [],
      labelsLoading: isLoading,
      labelsError: error,
      labelsValidating: isValidating,
      labelsEmpty: !isLoading && !data?.labels.length,
    }),
    [data?.labels, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export function useGetMailUnreadCount(enabled = true) {
  const url = enabled ? endpoints.mail.labels : '';

  const { data, isLoading } = useSWR<LabelsData>(url, fetcher, mailUnreadPollOptions);

  const unreadCount = useMemo(() => {
    const inbox = data?.labels?.find((label) => label.id === 'inbox');
    return inbox?.unreadCount ?? 0;
  }, [data?.labels]);

  return { unreadCount, unreadCountLoading: isLoading };
}

// ----------------------------------------------------------------------

type MailsData = {
  mails: IMail[];
};

export function useGetMails(labelId: string, searchQuery = '') {
  const trimmedQuery = searchQuery.trim();
  const params: Record<string, string> = { labelId };

  if (trimmedQuery) {
    params.q = trimmedQuery;
  }

  const url = labelId ? [endpoints.mail.list, { params }] : '';

  const { data, isLoading, error, isValidating } = useSWR<MailsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(() => {
    const byId = data?.mails.length ? keyBy(data?.mails, 'id') : {};
    const allIds = Object.keys(byId);

    return {
      mails: { byId, allIds },
      mailsLoading: isLoading,
      mailsError: error,
      mailsValidating: isValidating,
      mailsEmpty: !isLoading && !allIds.length,
    };
  }, [data?.mails, error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

type MailData = {
  mail: IMail;
};

export function useGetMail(mailId: string) {
  const url = mailId ? [endpoints.mail.details, { params: { mailId } }] : '';

  const { data, isLoading, error, isValidating } = useSWR<MailData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      mail: data?.mail,
      mailLoading: isLoading,
      mailError: error,
      mailValidating: isValidating,
    }),
    [data?.mail, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

function shouldDecrementLabelUnread(label: IMailLabel, mail: IMail): boolean {
  if (label.id === 'all') {
    return true;
  }
  if (label.id === 'inbox') {
    return mail.folder === 'inbox';
  }
  if (label.id === 'spam') {
    return mail.folder === 'spam';
  }
  if (label.id === 'important') {
    return mail.isImportant;
  }
  if (label.id === 'starred') {
    return mail.isStarred;
  }
  if (label.type === 'custom') {
    return mail.labelIds.includes(label.id);
  }
  return false;
}

export async function refreshMailCaches() {
  await Promise.all([
    mutate(endpoints.mail.labels),
    mutate((key) => Array.isArray(key) && key[0] === endpoints.mail.list),
    mutate((key) => Array.isArray(key) && key[0] === endpoints.mail.details),
  ]);
}

export async function markMailAsRead(mailId: string, mail?: IMail) {
  if (mail?.isUnread) {
    await mutate(
      endpoints.mail.labels,
      (current?: LabelsData) => {
        if (!current?.labels) {
          return current;
        }

        return {
          labels: current.labels.map((label) => {
            if (!shouldDecrementLabelUnread(label, mail)) {
              return label;
            }

            return {
              ...label,
              unreadCount: Math.max(0, (label.unreadCount ?? 0) - 1),
            };
          }),
        };
      },
      { revalidate: false },
    );

    await mutate(
      (key) => Array.isArray(key) && key[0] === endpoints.mail.list,
      (current?: MailsData) => {
        if (!current?.mails) {
          return current;
        }

        return {
          mails: current.mails.map((item) =>
            item.id === mailId ? { ...item, isUnread: false } : item,
          ),
        };
      },
      { revalidate: false },
    );

    await mutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === endpoints.mail.details &&
        (key[1] as { params?: { mailId?: string } })?.params?.mailId === mailId,
      (current?: MailData) => {
        if (!current?.mail) {
          return current;
        }

        return { mail: { ...current.mail, isUnread: false } };
      },
      { revalidate: false },
    );
  }

  await axios.patch(endpoints.mail.read, { mailId });
  await refreshMailCaches();
}

export type MailFlagsUpdate = {
  isStarred?: boolean;
  isImportant?: boolean;
  isUnread?: boolean;
};

async function mutateMailInCaches(mailId: string, patch: Partial<IMail>) {
  await mutate(
    (key) => Array.isArray(key) && key[0] === endpoints.mail.list,
    (current?: MailsData) => {
      if (!current?.mails) {
        return current;
      }

      return {
        mails: current.mails.map((item) => (item.id === mailId ? { ...item, ...patch } : item)),
      };
    },
    { revalidate: false },
  );

  await mutate(
    (key) =>
      Array.isArray(key) &&
      key[0] === endpoints.mail.details &&
      (key[1] as { params?: { mailId?: string } })?.params?.mailId === mailId,
    (current?: MailData) => {
      if (!current?.mail) {
        return current;
      }

      return { mail: { ...current.mail, ...patch } };
    },
    { revalidate: false },
  );
}

async function mutateMailUnreadCount(mail: IMail, delta: number) {
  await mutate(
    endpoints.mail.labels,
    (current?: LabelsData) => {
      if (!current?.labels) {
        return current;
      }

      return {
        labels: current.labels.map((label) => {
          if (!shouldDecrementLabelUnread(label, mail)) {
            return label;
          }

          return {
            ...label,
            unreadCount: Math.max(0, (label.unreadCount ?? 0) + delta),
          };
        }),
      };
    },
    { revalidate: false },
  );
}

export async function updateMailFlags(mailId: string, flags: MailFlagsUpdate, mail?: IMail) {
  const patch: Partial<IMail> = { ...flags };

  if (mail && typeof flags.isUnread === 'boolean' && flags.isUnread !== mail.isUnread) {
    await mutateMailUnreadCount(mail, flags.isUnread ? 1 : -1);
  }

  if (Object.keys(patch).length > 0) {
    await mutateMailInCaches(mailId, patch);
  }

  try {
    const res = await axios.patch(endpoints.mail.flags, { mailId, ...flags });
    await refreshMailCaches();
    return res.data as { mail?: IMail };
  } catch (error) {
    await refreshMailCaches();
    throw error;
  }
}

export async function deleteMail(mailId: string, mail?: IMail) {
  if (mail?.isUnread) {
    await mutate(
      endpoints.mail.labels,
      (current?: LabelsData) => {
        if (!current?.labels) {
          return current;
        }

        return {
          labels: current.labels.map((label) => {
            if (!shouldDecrementLabelUnread(label, mail)) {
              return label;
            }

            return {
              ...label,
              unreadCount: Math.max(0, (label.unreadCount ?? 0) - 1),
            };
          }),
        };
      },
      { revalidate: false },
    );
  }

  await mutate(
    (key) => Array.isArray(key) && key[0] === endpoints.mail.list,
    (current?: MailsData) => {
      if (!current?.mails) {
        return current;
      }

      return {
        mails: current.mails.filter((item) => item.id !== mailId),
      };
    },
    { revalidate: false },
  );

  const res = await axios.delete(endpoints.mail.delete(mailId));
  await refreshMailCaches();

  return res.data as { ok?: boolean; permanent?: boolean; message?: string };
}

// ----------------------------------------------------------------------

export type SendMailBody = {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  message: string;
  paperStyle?: string;
  paperBackgroundImage?: string | null;
};

export async function sendMail(body: SendMailBody): Promise<{
  message?: string;
  mailId?: string;
  inAppDeliveries?: number;
  externalDeliveries?: number;
  deliveryErrors?: string[];
}> {
  const res = await axios.post(endpoints.mail.send, body);

  await refreshMailCaches();

  return res.data as {
    message?: string;
    mailId?: string;
    inAppDeliveries?: number;
    externalDeliveries?: number;
    deliveryErrors?: string[];
  };
}
