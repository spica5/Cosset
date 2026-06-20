import type { IMailBackgroundImage } from 'src/types/mail-background';

import { getS3SignedUrl } from 'src/utils/helper';
import axios, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export async function createMailBackground(body: {
  imageKey: string;
  title?: string | null;
  order?: number | null;
}): Promise<IMailBackgroundImage> {
  const res = await axios.post(endpoints.mail.backgrounds.new, body);
  return res.data?.background as IMailBackgroundImage;
}

export async function deleteMailBackground(id: string): Promise<void> {
  await axios.delete(endpoints.mail.backgrounds.delete(id));
}

export async function resolveMailBackgroundUrls(
  backgrounds: IMailBackgroundImage[],
): Promise<IMailBackgroundImage[]> {
  return Promise.all(
    backgrounds.map(async (background) => {
      const url = await getS3SignedUrl(background.imageKey);
      return { ...background, url: url || null };
    }),
  );
}
