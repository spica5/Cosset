import axios, { endpoints } from 'src/utils/axios';

import { STORAGE_KEY } from 'src/auth/context/jwt/constant';

// ----------------------------------------------------------------------

export const PAGE_VISIT_KEYS = {
  home: 'home',
  blogs: 'blogs',
  albums: 'albums',
  drawers: 'drawers',
  bookshelf: 'bookshelf',
  documentation: 'documentation',
  journey: 'journey',
  communityPosts: 'community.posts',
  coffeeShops: 'community.coffee-shops',
  cinema: 'community.cinema',
  friends: 'community.friends',
  neighbors: 'community.neighbors',
} as const;

export type PageVisitKey = (typeof PAGE_VISIT_KEYS)[keyof typeof PAGE_VISIT_KEYS];

function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(STORAGE_KEY);
}

export async function recordPageVisit(input: {
  pageKey: PageVisitKey | string;
  label?: string;
  path?: string;
}): Promise<boolean> {
  try {
    const token = getAccessToken();

    await axios.post(
      endpoints.pageVisit.root,
      {
        pageKey: input.pageKey,
        label: input.label,
        path: input.path,
      },
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined,
    );

    return true;
  } catch (error) {
    console.warn('[page-visit] Failed to record visit', {
      pageKey: input.pageKey,
      error,
    });
    return false;
  }
}
