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

// ----------------------------------------------------------------------

type MailsData = {
  mails: IMail[];
};

export function useGetMails(labelId: string) {
  const url = labelId ? [endpoints.mail.list, { params: { labelId } }] : '';

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

export type SendMailBody = {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  message: string;
};

export async function sendMail(body: SendMailBody): Promise<{
  message?: string;
  mailId?: string;
  inAppDeliveries?: number;
  externalDeliveries?: number;
  deliveryErrors?: string[];
}> {
  const res = await axios.post(endpoints.mail.send, body);

  await Promise.all([
    mutate(endpoints.mail.labels),
    mutate((key) => Array.isArray(key) && key[0] === endpoints.mail.list),
    mutate((key) => Array.isArray(key) && key[0] === endpoints.mail.details),
  ]);

  return res.data as {
    message?: string;
    mailId?: string;
    inAppDeliveries?: number;
    externalDeliveries?: number;
    deliveryErrors?: string[];
  };
}
