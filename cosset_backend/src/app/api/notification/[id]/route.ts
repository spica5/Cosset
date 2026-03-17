import type { NextRequest } from 'next/server';

import {
  getNotificationById,
  updateNotification,
  deleteNotification,
} from 'src/models/notifications';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const normalizeOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return undefined;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id, 10);

    const notification = await getNotificationById(notificationId);

    if (!notification) {
      return response({ message: 'Notification not found' }, STATUS.NOT_FOUND);
    }

    return response({ notification }, STATUS.OK);
  } catch (error) {
    return handleError('Notification - Get', error as Error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id, 10);
    const body = await req.json();
    const updates = body?.updates;

    if (!updates) {
      return response({ message: 'Updates data is required' }, STATUS.BAD_REQUEST);
    }

    const updated = await updateNotification(notificationId, {
      customerId: updates.customerId,
      avatarUrl: updates.avatarUrl,
      type: updates.type !== undefined ? Number(updates.type) : undefined,
      category: updates.category !== undefined ? Number(updates.category) : undefined,
      isUnRead: normalizeOptionalBoolean(updates.isUnRead),
      isArchived: normalizeOptionalBoolean(updates.isArchived),
      title: updates.title,
      content: updates.content,
    });

    return response({ notification: updated }, STATUS.OK);
  } catch (error) {
    return handleError('Notification - Update', error as Error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id, 10);

    const deleted = await deleteNotification(notificationId);

    if (!deleted) {
      return response({ message: 'Notification not found' }, STATUS.NOT_FOUND);
    }

    return response({ message: 'Notification deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Notification - Delete', error as Error);
  }
}
