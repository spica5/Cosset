import type { NextRequest } from 'next/server';

import { getAuthenticatedUser } from 'src/utils/request-auth';
import { STATUS, response, handleError } from 'src/utils/response';

import {
  getTestingDisclosureSetting,
  setTestingDisclosureSetting,
  type WebsiteTestingDisclosureSection,
} from 'src/models/site-settings';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** GET /api/site-settings/testing-disclosure — public (sign-up + settings) */
export async function GET() {
  try {
    const disclosure = await getTestingDisclosureSetting();
    return response({ disclosure }, STATUS.OK);
  } catch (error) {
    return handleError('Testing Disclosure - Get', error as Error);
  }
}

/** PUT /api/site-settings/testing-disclosure — admin only */
export async function PUT(req: NextRequest) {
  try {
    const actor = await getAuthenticatedUser(req);
    if (!actor || actor.role !== 'admin') {
      return response({ message: 'Admin access required' }, STATUS.FORBIDDEN);
    }

    const body = await req.json();
    const title = typeof body?.title === 'string' ? body.title : '';
    const intro = typeof body?.intro === 'string' ? body.intro : '';
    const sections = Array.isArray(body?.sections)
      ? (body.sections as WebsiteTestingDisclosureSection[])
      : [];

    if (!String(title).trim()) {
      return response({ message: 'Title is required' }, STATUS.BAD_REQUEST);
    }

    if (!String(intro).trim()) {
      return response({ message: 'Intro is required' }, STATUS.BAD_REQUEST);
    }

    if (!sections.length) {
      return response({ message: 'At least one section is required' }, STATUS.BAD_REQUEST);
    }

    const disclosure = await setTestingDisclosureSetting({
      title,
      intro,
      sections,
      updatedBy: actor.id,
    });

    return response({ disclosure }, STATUS.OK);
  } catch (error) {
    return handleError('Testing Disclosure - Update', error as Error);
  }
}
