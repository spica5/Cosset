import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { STATUS, response, handleError } from 'src/utils/response';

import { getCinemaFilmById } from 'src/models/cinema-films';
import { createCinemaFilmScreening } from 'src/models/cinema-film-screenings';
import { createNotification } from 'src/models/notifications';
import { listCinemaScheduleNotifyCustomerIds } from 'src/models/cinema-notification-prefs';
import { sendWebPushToUser } from 'src/utils/web-push';
import { FRIEND_ACTIVITY_NOTIFICATION_TYPE } from 'src/utils/friend-activity-notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const screening = body?.screening;
    const filmId = Number.parseInt(String(screening?.filmId || ''), 10);
    const customerId = String(screening?.customerId || '').trim();

    if (!customerId) {
      return response({ message: 'customerId is required' }, STATUS.BAD_REQUEST);
    }

    if (Number.isNaN(filmId)) {
      return response({ message: 'filmId is required' }, STATUS.BAD_REQUEST);
    }

    const film = await getCinemaFilmById(filmId);

    if (!film) {
      return response({ message: 'Film not found' }, STATUS.BAD_REQUEST);
    }

    if (film.customerId !== customerId) {
      return response({ message: 'Film not found' }, STATUS.NOT_FOUND);
    }

    const created = await createCinemaFilmScreening({
      filmId,
      customerId,
      showAt: screening.showAt ?? null,
      showAt2: screening.showAt2 ?? null,
      showFriday: screening.showFriday ?? true,
      showSaturday: screening.showSaturday ?? true,
      showSunday: screening.showSunday ?? true,
      showFlexible: screening.showFlexible ?? false,
      pricingType: screening.pricingType ?? null,
      price: screening.price ?? null,
      order: screening.order ?? null,
      isPublic: screening.isPublic ?? 1,
    });

    // Notify users who opted in to cinema schedule / upcoming-movie alerts.
    if (Number(created.isPublic ?? 1) === 1) {
      try {
        const filmTitle = film.title || 'a new film';
        const title = '<p><strong>Upcoming movie</strong> on Cosset Cinema</p>';
        const content = `"${filmTitle}" is now scheduled at Cosset Cinema`;
        const recipients = await listCinemaScheduleNotifyCustomerIds();

        await Promise.all(
          recipients.map(async (recipientId) => {
            try {
              await createNotification({
                customerId: recipientId,
                avatarUrl: film.posterImage || null,
                type: FRIEND_ACTIVITY_NOTIFICATION_TYPE.cinema,
                category: 1,
                isUnRead: true,
                isArchived: false,
                title,
                content,
              });
              await sendWebPushToUser(recipientId, {
                title,
                body: content,
                url: '/dashboard/community/cinema',
                tag: `cinema-upcoming-${created.id}`,
              });
            } catch (error) {
              console.error(`[Cinema Screening] failed to notify ${recipientId}`, error);
            }
          }),
        );
      } catch (notificationError) {
        console.error('[Cinema Screening] failed upcoming-movie notifications', notificationError);
      }
    }

    return response({ screening: created }, STATUS.OK);
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (String(error.code || '').startsWith('INVALID_')) {
        return response({ message: error.message, code: error.code }, STATUS.BAD_REQUEST);
      }

      if (error.code === 'CREATE_CINEMA_FILM_SCREENING_FAILED') {
        return response({ message: error.message, code: error.code }, STATUS.BAD_REQUEST);
      }
    }

    return handleError('Cinema Screening - Create', error as Error);
  }
}
