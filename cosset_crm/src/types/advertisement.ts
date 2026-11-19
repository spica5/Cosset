export type AdvertisementStatus = 'draft' | 'active' | 'paused' | 'archived';

export type AdvertisementMediaType = 'text' | 'image' | 'video' | 'mixed';

export type IAdvertisement = {
  id: number;
  title: string;
  bodyText?: string | null;
  mediaType: AdvertisementMediaType;
  imageKey?: string | null;
  videoKey?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  placement?: string | null;
  status: AdvertisementStatus;
  priority: number;
  companyName: string;
  companyWebsite?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyLogoKey?: string | null;
  companyNotes?: string | null;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type AdvertisementInput = Omit<
  IAdvertisement,
  'id' | 'createdAt' | 'updatedAt' | 'mediaType' | 'status' | 'priority'
> & {
  mediaType?: AdvertisementMediaType | string | null;
  status?: AdvertisementStatus | string | null;
  priority?: number | null;
};
