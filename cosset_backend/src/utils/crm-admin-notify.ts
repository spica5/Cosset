import { createNotification } from 'src/models/notifications';
import { getAdminUsers } from 'src/models/users';

// ----------------------------------------------------------------------

/** Shared numeric types used by the CRM inbox (customer + payment only). */
export const CRM_NOTIFICATION_TYPE = {
  payment: 5,
  businessRequest: 10,
  customer: 13,
} as const;

export const CRM_NOTIFICATION_CATEGORY = {
  payment: 4,
  customer: 5,
} as const;

type NotifyCrmAdminsInput = {
  type: number;
  category: number;
  title: string;
  content: string;
  avatarUrl?: string | null;
};

export async function notifyCrmAdmins({
  type,
  category,
  title,
  content,
  avatarUrl = null,
}: NotifyCrmAdminsInput): Promise<void> {
  const admins = await getAdminUsers();

  if (!admins.length) {
    return;
  }

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        customerId: admin.id,
        avatarUrl,
        type,
        category,
        isUnRead: true,
        isArchived: false,
        title,
        content,
      }),
    ),
  );
}

export async function notifyCrmAdminsOfNewCustomer(input: {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  const displayName = String(input.name || '').trim() || input.email || 'A customer';

  await notifyCrmAdmins({
    type: CRM_NOTIFICATION_TYPE.customer,
    category: CRM_NOTIFICATION_CATEGORY.customer,
    title: 'New customer',
    content: `${displayName} signed up.`,
    avatarUrl: input.avatarUrl ?? null,
  });
}

export async function notifyCrmAdminsOfPayment(input: {
  customerName: string;
  amountLabel?: string | null;
  planLabel?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  const name = String(input.customerName || '').trim() || 'A customer';
  const detail =
    input.amountLabel ||
    (input.planLabel ? `${input.planLabel} plan` : null) ||
    'a payment';

  await notifyCrmAdmins({
    type: CRM_NOTIFICATION_TYPE.payment,
    category: CRM_NOTIFICATION_CATEGORY.payment,
    title: 'Payment update',
    content: `${name} completed ${detail}.`,
    avatarUrl: input.avatarUrl ?? null,
  });
}
