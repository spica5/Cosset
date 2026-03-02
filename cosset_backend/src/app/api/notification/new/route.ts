import type { NextRequest } from 'next/server';

import { createNotification } from 'src/models/notifications';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const notification = body?.notification;

    if (!notification?.customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    if (notification?.type === undefined || notification?.category === undefined) {
      return response({ message: 'type and category are required' }, STATUS.BAD_REQUEST);
    }

    if (notification?.isUnRead === undefined) {
      return response({ message: 'isUnRead is required' }, STATUS.BAD_REQUEST);
    }

    const newNotification = await createNotification({
      customerId: notification.customerId,
      avatarUrl: notification.avatarUrl ?? null,
      type: Number(notification.type),
      category: Number(notification.category),
      isUnRead: Boolean(notification.isUnRead),
      title: notification.title ?? null,
      content: notification.content ?? null,
    });

    return response({ notification: newNotification }, STATUS.OK);
  } catch (error) {
    return handleError('Notification - Create', error as Error);
  }
}
