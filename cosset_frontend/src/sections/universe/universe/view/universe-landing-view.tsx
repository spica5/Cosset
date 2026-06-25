'use client';

import type { IAlbumItem } from 'src/types/album';
import type { ICollectionDrawerItem } from 'src/types/collection-item';
import type { IUniverseProps } from 'src/types/universe';

import { useMemo, useState, useEffect } from 'react';
import { mutate } from 'swr';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';
import { getS3SignedUrl } from 'src/utils/helper';
import axiosInstance, { endpoints } from 'src/utils/axios';
import {
  type DesignSpaceType,
  DEFAULT_DESIGN_SPACE_TYPE,
  getDesignSpaceOverlaySx,
  getDesignSpaceBackgroundFilter,
  normalizeDesignSpaceType,
} from 'src/utils/design-space-type';

import { useGetBlogs } from 'src/actions/blog';
import { useGetCommunityUsers } from 'src/actions/user';
import { useGetFriends } from 'src/actions/friend';
import { useGetGuestArea } from 'src/actions/guestarea';
import { useGetCollections } from 'src/actions/collection';
import { useGetBookshelfEbooks, getBookshelfEbookListEndpoint } from 'src/actions/bookshelf-ebook';
import { useGetBookshelfAudiobooks, getBookshelfAudiobookListEndpoint } from 'src/actions/bookshelf-audiobook';
import { createNotification } from 'src/actions/notification';
import { useGiftCount, useGetViewedGiftIds } from 'src/actions/gift';
import { useGetCollectionItems, useGetViewedCollectionItemIds } from 'src/actions/collection-item';

import { useAuthContext } from 'src/auth/hooks';

import { UniverseLandingHero } from '../landing/universe-landing-hero';
import { UniverseLandingBlogs } from '../landing/universe-landing-blogs';
import { UniverseLandingDrawer } from '../landing/universe-landing-drawer';
import { UniverseLandingAlbums } from '../landing/universe-landing-albums';
import { UniverseLandingMySpace } from '../landing/universe-landing-myspace';
import { UniverseLandingBookshelf } from '../landing/universe-landing-bookshelf';
import { useUniverseHomeSpaceAccess } from './use-universe-home-space-access';
import { UniverseLandingCollectionItems } from '../landing/universe-landing-collection-items';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
};

type VisitorItem = {
  id: string;
  name: string;
  avatarUrl: string;
};

const DRAWER_COLLECTION_MAP = {
  letter: 4,
  goodMemo: 1,
  sadMemo: 2,
} as const;

const isPublicBookshelfItem = (isPublic: unknown): boolean => {
  if (typeof isPublic === 'number') {
    return isPublic === 1;
  }

  if (typeof isPublic === 'string') {
    const normalized = isPublic.trim().toLowerCase();
    return normalized === '1' || normalized === 'public' || normalized === 'true';
  }

  if (typeof isPublic === 'boolean') {
    return isPublic;
  }

  return false;
};

const sortBookshelfItems = <
  T extends { order?: number | null; createdAt?: string | Date | null },
>(
  items: T[],
) =>
  [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return bTime - aTime;
  });

const buildDrawerCollectionStats = (
  collectionItems: ICollectionDrawerItem[],
  viewedCollectionItemIds: number[],
) => {
  const publicItemIds = collectionItems
    .filter((item) => item.isPublic === 1)
    .map((item) => String(item.id));

  const viewedIdSet = new Set(viewedCollectionItemIds.map(String));
  const viewedCount = publicItemIds.filter((id) => viewedIdSet.has(id)).length;
  const count = publicItemIds.length;

  return {
    count,
    viewedCount,
    unreadCount: Math.max(0, count - viewedCount),
  };
};

export function UniverseLandingView({
  customerId,
  isFullScreen = false,
  onToggleFullScreen,
}: Props) {
  const { guestarea } = useGetGuestArea(customerId);
  const { user, loading: userLoading, authenticated } = useAuthContext();
  const viewerId = String(user?.id || '').trim();
  const isCurrentCustomer = !!viewerId && viewerId === String(customerId || '').trim();
  const { isAccessLoading, isVisitorHomeSpaceOnly } = useUniverseHomeSpaceAccess(customerId);
  const { users } = useGetCommunityUsers(100, 0, authenticated);
  const { friends: acceptedFriends, friendsLoading: acceptedFriendsLoading } = useGetFriends(
    viewerId,
    'accepted',
    authenticated && !!viewerId
  );
  const { friends: pendingFriends, friendsLoading: pendingFriendsLoading } = useGetFriends(
    viewerId,
    'pending',
    authenticated && !!viewerId
  );
  const { blogs, blogsLoading } = useGetBlogs(customerId);
  const { collections } = useGetCollections(customerId);
  const { ebooks, ebooksLoading } = useGetBookshelfEbooks(customerId);
  const { audiobooks, audiobooksLoading } = useGetBookshelfAudiobooks(customerId);

  useEffect(() => {
    const ebookListEndpoint = getBookshelfEbookListEndpoint(customerId);
    const audiobookListEndpoint = getBookshelfAudiobookListEndpoint(customerId);

    if (ebookListEndpoint) {
      mutate(ebookListEndpoint);
    }
    if (audiobookListEndpoint) {
      mutate(audiobookListEndpoint);
    }
  }, [customerId]);
  const [heroUrl, setHeroUrl] = useState('');
  const [customerName, setCustomerName] = useState('Customer');
  const [customerAvatarKey, setCustomerAvatarKey] = useState('');
  const [customerAvatarUrl, setCustomerAvatarUrl] = useState('');
  const [requestingFriend, setRequestingFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [designGalleryUrls, setDesignGalleryUrls] = useState<string[]>([]);
  const [designSpaceType, setDesignSpaceType] = useState<DesignSpaceType>(DEFAULT_DESIGN_SPACE_TYPE);
  const [sharedAlbums, setSharedAlbums] = useState<
    (IAlbumItem & { signedCoverUrl?: string })[]
  >([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);

  const defaultCoverImage = `${CONFIG.universe.assetsDir}/assets/images/guest-area/cosset_default.png`;

  const giftCountData = useGiftCount(customerId, 'Public', 'gift');

  const viewedGiftData = useGetViewedGiftIds(customerId, 'Public', 'gift');

  const { collectionItems: letterCollectionItems, collectionItemsLoading: letterCollectionItemsLoading } =
    useGetCollectionItems(DRAWER_COLLECTION_MAP.letter, customerId);
  const { collectionItems: goodMemoCollectionItems, collectionItemsLoading: goodMemoCollectionItemsLoading } =
    useGetCollectionItems(DRAWER_COLLECTION_MAP.goodMemo, customerId);
  const { collectionItems: sadMemoCollectionItems, collectionItemsLoading: sadMemoCollectionItemsLoading } =
    useGetCollectionItems(DRAWER_COLLECTION_MAP.sadMemo, customerId);

  const {
    viewedCollectionItemIds: viewedLetterCollectionItemIds,
    viewedCollectionItemIdsLoading: viewedLetterCollectionItemIdsLoading,
  } = useGetViewedCollectionItemIds(customerId, DRAWER_COLLECTION_MAP.letter);

  const {
    viewedCollectionItemIds: viewedGoodMemoCollectionItemIds,
    viewedCollectionItemIdsLoading: viewedGoodMemoCollectionItemIdsLoading,
  } = useGetViewedCollectionItemIds(customerId, DRAWER_COLLECTION_MAP.goodMemo);

  const {
    viewedCollectionItemIds: viewedSadMemoCollectionItemIds,
    viewedCollectionItemIdsLoading: viewedSadMemoCollectionItemIdsLoading,
  } = useGetViewedCollectionItemIds(customerId, DRAWER_COLLECTION_MAP.sadMemo);

  const letterDrawerStats = useMemo(
    () => buildDrawerCollectionStats(letterCollectionItems, viewedLetterCollectionItemIds),
    [letterCollectionItems, viewedLetterCollectionItemIds],
  );

  const goodMemoDrawerStats = useMemo(
    () => buildDrawerCollectionStats(goodMemoCollectionItems, viewedGoodMemoCollectionItemIds),
    [goodMemoCollectionItems, viewedGoodMemoCollectionItemIds],
  );

  const sadMemoDrawerStats = useMemo(
    () => buildDrawerCollectionStats(sadMemoCollectionItems, viewedSadMemoCollectionItemIds),
    [sadMemoCollectionItems, viewedSadMemoCollectionItemIds],
  );

  // set cover url
  useEffect(() => {
    let mounted = true;

    const resolveCover = async () => {
      const key = guestarea?.coverUrl;
      if (!key) {
        if (mounted) setHeroUrl('');
        return;
      }

      if (key.startsWith('http://') || key.startsWith('https://')) {
        if (mounted) setHeroUrl(key);
        return;
      }

      const signedUrl = await getS3SignedUrl(key);
      if (mounted) {
        setHeroUrl(signedUrl || '');
      }
    };

    resolveCover();

    return () => {
      mounted = false;
    };
  }, [guestarea?.coverUrl]);

  useEffect(() => {
    let mounted = true;

    const loadCustomerProfile = async () => {
      if (!customerId) {
        if (mounted) {
          setCustomerName('Customer');
          setCustomerAvatarKey('');
        }
        return;
      }

      try {
        const res = await axiosInstance.get(endpoints.user.details(customerId));
        const customer = res.data?.user as
          | {
              displayName?: string;
              firstName?: string;
              lastName?: string;
              email?: string;
              photoURL?: string;
            }
          | undefined;

        const resolvedName =
          customer?.displayName ||
          `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
          customer?.email ||
          guestarea?.title ||
          'Customer';

        if (mounted) {
          setCustomerName(resolvedName);
          setCustomerAvatarKey(customer?.photoURL || '');
        }
      } catch (error) {
        console.error('Failed to load customer profile for universe view', error);
        if (mounted) {
          setCustomerName(guestarea?.title || 'Customer');
          setCustomerAvatarKey('');
        }
      }
    };

    loadCustomerProfile();

    return () => {
      mounted = false;
    };
  }, [customerId, guestarea?.title]);

  useEffect(() => {
    let mounted = true;

    const resolveCustomerAvatar = async () => {
      const key = customerAvatarKey;

      if (!key) {
        if (mounted) setCustomerAvatarUrl('');
        return;
      }

      if (key.startsWith('public:')) {
        if (mounted) setCustomerAvatarUrl(key.replace(/^public:/, ''));
        return;
      }

      if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('/')) {
        if (mounted) setCustomerAvatarUrl(key);
        return;
      }

      const signedUrl = await getS3SignedUrl(key);

      if (mounted) {
        setCustomerAvatarUrl(signedUrl || '');
      }
    };

    resolveCustomerAvatar();

    return () => {
      mounted = false;
    };
  }, [customerAvatarKey]);

  // set design space gallery
  useEffect(() => {
    let mounted = true;

    const loadDesignSpaceGallery = async () => {
      try {
        const res = await axiosInstance.get(endpoints.designSpace.root, {
          params: { customerId },
        });

        const designSpaces =
          (res.data?.designSpaces ?? []) as Array<{
            background?: string | null;
            designType?: string | null;
          }>;

        const backgroundRaw = designSpaces[0]?.background || '';
        setDesignSpaceType(normalizeDesignSpaceType(designSpaces[0]?.designType));

        let imageKeys: string[] = [];

        try {
          const parsed = JSON.parse(backgroundRaw);
          if (Array.isArray(parsed)) {
            imageKeys = parsed.filter((value): value is string => typeof value === 'string');
          } else if (typeof parsed === 'string' && parsed.trim()) {
            imageKeys = [parsed.trim()];
          }
        } catch {
          if (typeof backgroundRaw === 'string' && backgroundRaw.trim()) {
            imageKeys = [backgroundRaw.trim()];
          }
        }

        const resolvedUrls = await Promise.all(
          imageKeys.map(async (key) => {
            const value = key.trim();
            if (!value) return '';

            if (value.startsWith('public:')) {
              return value.replace(/^public:/, '');
            }

            if (value.startsWith('http://') || value.startsWith('https://')) {
              return value;
            }

            const signed = await getS3SignedUrl(value);
            return signed || '';
          })
        );

        if (!mounted) return;

        const urls = Array.from(new Set(resolvedUrls.filter(Boolean)));
        setDesignGalleryUrls(urls.length > 0 ? urls : (defaultCoverImage ? [defaultCoverImage] : []));
      } catch (error) {
        console.error('Failed to load design space gallery for universe view', error);
        if (mounted) {
          setDesignGalleryUrls(defaultCoverImage ? [defaultCoverImage] : []);
          setDesignSpaceType(DEFAULT_DESIGN_SPACE_TYPE);
        }
      }
    };

    loadDesignSpaceGallery();

    return () => {
      mounted = false;
    };
  }, [customerId]);

  useEffect(() => {
    const notifyCustomerVisit = async () => {
      if (!customerId) return;
      if (userLoading || !authenticated) return;

      const visitorId = user?.id ? String(user.id) : '';
      if (!visitorId) return;
      if (visitorId === customerId) return;

      const storageKey = `notification:visit:${customerId}:${visitorId}`;
      if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey) === '1') return;

      const fallbackVisitor = users.find((item) => String(item.id) === visitorId);
      const visitorName =
        user?.displayName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        fallbackVisitor?.displayName ||
        `${fallbackVisitor?.firstName || ''} ${fallbackVisitor?.lastName || ''}`.trim() ||
        user?.email ||
        fallbackVisitor?.email ||
        'A visitor';

      const visitorAvatar = user?.photoURL || fallbackVisitor?.photoURL || null;

      await createNotification({
        customerId,
        avatarUrl: visitorAvatar,
        type: 7,
        category: 1,
        isUnRead: true,
        title: `<p><strong>${visitorName}</strong> visited your Home space</p>`,
        content: `${visitorName} visited your Home space`,
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(storageKey, '1');
      }
    };

    notifyCustomerVisit().catch((error) => {
      console.error('Failed to create visit notification', error);
    });
  }, [authenticated, customerId, user, userLoading, users]);

  useEffect(() => {
    let mounted = true;

    const loadAlbums = async () => {
      setAlbumsLoading(true);
      try {
        const res = await axiosInstance.get(endpoints.album.list, {
          params: { customerId, limit: 100, offset: 0 },
        });

        const albums = (res.data?.albums ?? []) as IAlbumItem[];
        const publicAlbums = albums.filter((album) => album.openness === 'Public');

        const withSignedUrl = await Promise.all(
          publicAlbums.map(async (album) => {
            const coverKey = album.coverUrl;

            let signedCoverUrl = '';
            if (!coverKey) {
              signedCoverUrl = '';
            } else if (coverKey.startsWith('http://') || coverKey.startsWith('https://')) {
              signedCoverUrl = coverKey;
            } else {
              signedCoverUrl = (await getS3SignedUrl(coverKey)) || '';
            }

            return {
              ...album,
              signedCoverUrl,
              imgCount: Number(album.imgCount ?? 0),
            };
          })
        );

        if (mounted) {
          setSharedAlbums(withSignedUrl);
        }
      } catch (error) {
        console.error('Failed to load albums for universe view', error);
        if (mounted) {
          setSharedAlbums([]);
        }
      } finally {
        if (mounted) {
          setAlbumsLoading(false);
        }
      }
    };

    loadAlbums();

    return () => {
      mounted = false;
    };
  }, [customerId]);

  const resolvedUniverse = useMemo<IUniverseProps>(() => {
    const hero = designGalleryUrls.length > 0 ? designGalleryUrls[0] : (heroUrl || '');
    const gallery = designGalleryUrls.length ? designGalleryUrls : [];

    if (!guestarea) {
      const now = new Date().toISOString();
      return {
        id: customerId,
        name: 'My Universe',
        heroUrl: hero,
        coverUrl: hero,
        mood: '',
        motif: '',
        duration: '',
        connections: 0,
        gallery,
        favorited: false,
        description: '',
        ratingNumber: 0,
        totalReviews: 0,
        highlights: [],
        createdAt: now,
        openness: 'Private',
        available: {
          start: now,
          end: now,
        },
        program: [],
      };
    }

    const now = new Date().toISOString();
    return {
      id: String(guestarea.id ?? customerId),
      name: guestarea.title || 'My Universe',
      heroUrl: hero,
      coverUrl: hero,
      mood: guestarea.mood || '',
      motif: guestarea.motif || '',
      duration: '',
      connections: 0,
      gallery,
      favorited: false,
      description: guestarea.designSpace || '',
      ratingNumber: 0,
      totalReviews: 0,
      highlights: [],
      createdAt: now,
      openness: 'Private',
      available: {
        start: now,
        end: now,
      },
      program: [],
    };
  }, [customerId, designGalleryUrls, guestarea, heroUrl]);

  const drawerSettings = useMemo(() => {
    if (!guestarea?.drawer) {
      return {
        gift: false,
        letter: false,
        goodMemo: false,
        sadMemo: false,
        ebooks: false,
        audiobooks: false,
        collectionItems: {} as Record<string, boolean>,
      };
    }

    try {
      const parsed = JSON.parse(guestarea.drawer) as {
        gift?: boolean;
        letter?: boolean;
        goodMemo?: boolean;
        sadMemo?: boolean;
        ebooks?: boolean;
        audiobooks?: boolean;
        collectionItems?: Record<string, unknown>;
      };

      const collectionItems = Object.entries(parsed.collectionItems || {}).reduce<Record<string, boolean>>(
        (acc, [key, value]) => {
          acc[String(key)] = !!value;
          return acc;
        },
        {},
      );

      return {
        gift: !!parsed.gift,
        letter: !!parsed.letter,
        goodMemo: !!parsed.goodMemo,
        sadMemo: !!parsed.sadMemo,
        ebooks: !!parsed.ebooks,
        audiobooks: !!parsed.audiobooks,
        collectionItems,
      };
    } catch {
      return {
        gift: false,
        letter: false,
        goodMemo: false,
        sadMemo: false,
        ebooks: false,
        audiobooks: false,
        collectionItems: {} as Record<string, boolean>,
      };
    }
  }, [guestarea?.drawer]);

  const sharedCollections = useMemo(
    () =>
      [...collections]
        .filter((collection) => !!drawerSettings.collectionItems[String(collection.id)])
        .sort((a, b) => {
          const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;

          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }

          return (a.name || '').localeCompare(b.name || '');
        }),
    [collections, drawerSettings.collectionItems],
  );

  const sharedBlogs = useMemo(
    () =>
      [...blogs]
        .filter((blog) => blog.isPublic === 1)
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          return bTime - aTime;
        }),
    [blogs],
  );

  const publicEbooks = useMemo(
    () => sortBookshelfItems(ebooks.filter((ebook) => isPublicBookshelfItem(ebook.isPublic))),
    [ebooks],
  );

  const publicAudiobooks = useMemo(
    () =>
      sortBookshelfItems(
        audiobooks.filter((audiobook) => isPublicBookshelfItem(audiobook.isPublic)),
      ),
    [audiobooks],
  );

  const drawerItems = useMemo(
    () => [
      {
        key: 'gift',
        label: 'Gifts and Souvenirs',
        icon: 'solar:gift-bold',
        enabled: drawerSettings.gift || giftCountData.count > 0,
        count: giftCountData.count,
        viewedCount: viewedGiftData.viewedGiftIds.length,
        unreadCount: Math.max(0, giftCountData.count - viewedGiftData.viewedGiftIds.length),
        href: paths.universe.drawer.item(customerId, 'gift'),
      },
      {
        key: 'letter',
        label: 'Letters',
        icon: 'solar:file-text-bold',
        enabled: drawerSettings.letter || letterDrawerStats.count > 0,
        count: letterDrawerStats.count,
        viewedCount: letterDrawerStats.viewedCount,
        unreadCount: letterDrawerStats.unreadCount,
        href: paths.universe.drawer.item(customerId, 'letter'),
      },
      {
        key: 'goodMemo',
        label: 'Good Memories',
        icon: 'solar:sun-bold',
        enabled: drawerSettings.goodMemo || goodMemoDrawerStats.count > 0,
        count: goodMemoDrawerStats.count,
        viewedCount: goodMemoDrawerStats.viewedCount,
        unreadCount: goodMemoDrawerStats.unreadCount,
        href: paths.universe.drawer.item(customerId, 'goodMemo'),
      },
      {
        key: 'sadMemo',
        label: 'Sad Memories',
        icon: 'solar:cloud-bold',
        enabled: drawerSettings.sadMemo || sadMemoDrawerStats.count > 0,
        count: sadMemoDrawerStats.count,
        viewedCount: sadMemoDrawerStats.viewedCount,
        unreadCount: sadMemoDrawerStats.unreadCount,
        href: paths.universe.drawer.item(customerId, 'sadMemo'),
      },
    ],
    [
      customerId,
      drawerSettings.gift,
      drawerSettings.letter,
      drawerSettings.goodMemo,
      drawerSettings.sadMemo,
      giftCountData.count,
      viewedGiftData.viewedGiftIds.length,
      letterDrawerStats.count,
      letterDrawerStats.unreadCount,
      letterDrawerStats.viewedCount,
      goodMemoDrawerStats.count,
      goodMemoDrawerStats.unreadCount,
      goodMemoDrawerStats.viewedCount,
      sadMemoDrawerStats.count,
      sadMemoDrawerStats.unreadCount,
      sadMemoDrawerStats.viewedCount,
    ]
  );

  const sharedDrawerItems = drawerItems.filter((item) => item.enabled);
  const showDrawersSection =
    drawerSettings.gift ||
    drawerSettings.letter ||
    drawerSettings.goodMemo ||
    drawerSettings.sadMemo ||
    giftCountData.count > 0 ||
    letterDrawerStats.count > 0 ||
    goodMemoDrawerStats.count > 0 ||
    sadMemoDrawerStats.count > 0;
  const allowVisitorSections = !isAccessLoading && !isVisitorHomeSpaceOnly;
  const sharedBlogViewItems = allowVisitorSections && guestarea?.blog ? sharedBlogs : [];
  const showBookshelfEbooks = drawerSettings.ebooks || publicEbooks.length > 0;
  const showBookshelfAudiobooks = drawerSettings.audiobooks || publicAudiobooks.length > 0;
  const showBookshelfSection =
    allowVisitorSections && (showBookshelfEbooks || showBookshelfAudiobooks);
  const sharedBookshelfCount =
    (showBookshelfEbooks ? publicEbooks.length : 0) +
    (showBookshelfAudiobooks ? publicAudiobooks.length : 0);

  const mySpaceSectionCounts = useMemo(
    () => ({
      ...(guestarea?.blog ? { 'blogs-section': sharedBlogViewItems.length } : {}),
      ...(allowVisitorSections
        ? {
            'albums-section': sharedAlbums.length,
            ...(showDrawersSection
              ? {
                  'drawers-section': sharedDrawerItems.reduce((sum, item) => sum + item.count, 0),
                }
              : {}),
            'collection-items-section': sharedCollections.length,
            ...(showBookshelfSection ? { 'bookshelf-section': sharedBookshelfCount } : {}),
          }
        : {}),
    }),
    [
      allowVisitorSections,
      guestarea?.blog,
      sharedAlbums.length,
      sharedBlogViewItems.length,
      sharedBookshelfCount,
      sharedCollections.length,
      sharedDrawerItems,
      showBookshelfSection,
      showDrawersSection,
    ],
  );

  const visitors = useMemo<VisitorItem[]>(() => {
    const normalizedCustomerId = String(customerId || '');
    const visitorMap = new Map<string, VisitorItem>();

    const normalizeVisitor = (candidate: Record<string, any> | null | undefined): VisitorItem | null => {
      const id = String(candidate?.id || '').trim();

      if (!id || id === normalizedCustomerId) {
        return null;
      }

      const displayName = String(candidate?.displayName || '').trim();
      const fullName = `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim();
      const email = String(candidate?.email || '').trim();

      return {
        id,
        name: displayName || fullName || email || 'Visitor',
        avatarUrl: String(candidate?.photoURL || '').trim(),
      };
    };

    const currentUserVisitor = normalizeVisitor(user);

    if (currentUserVisitor) {
      visitorMap.set(currentUserVisitor.id, currentUserVisitor);
    }

    users.forEach((candidate) => {
      const visitor = normalizeVisitor(candidate);

      if (!visitor || visitorMap.has(visitor.id)) {
        return;
      }

      visitorMap.set(visitor.id, visitor);
    });

    return Array.from(visitorMap.values()).slice(0, 6);
  }, [customerId, user, users]);

  const drawerLoading =
    giftCountData.loading ||
    letterCollectionItemsLoading ||
    goodMemoCollectionItemsLoading ||
    sadMemoCollectionItemsLoading ||
    viewedGiftData.viewedGiftIdsLoading ||
    viewedLetterCollectionItemIdsLoading ||
    viewedGoodMemoCollectionItemIdsLoading ||
    viewedSadMemoCollectionItemIdsLoading;

  const isFriend = useMemo(() => {
    const targetId = String(customerId || '').trim();
    if (!viewerId || !targetId) return false;

    return acceptedFriends.some(
      (relation) => relation.userId1 === targetId || relation.userId2 === targetId
    );
  }, [acceptedFriends, customerId, viewerId]);

  const hasPendingRequest = useMemo(() => {
    const targetId = String(customerId || '').trim();
    if (!viewerId || !targetId) return false;

    return pendingFriends.some(
      (relation) => relation.userId1 === targetId || relation.userId2 === targetId
    );
  }, [customerId, pendingFriends, viewerId]);

  const friendshipState: 'you' | 'friend' | 'none' | 'requested' = isCurrentCustomer
    ? 'you'
    : isFriend
      ? 'friend'
      : requestSent || hasPendingRequest
        ? 'requested'
        : 'none';

  const canRequestFriend =
    authenticated &&
    !!viewerId &&
    !isCurrentCustomer &&
    !isFriend &&
    !hasPendingRequest &&
    !requestSent &&
    !acceptedFriendsLoading &&
    !pendingFriendsLoading;

  const handleRequestFriend = async () => {
    if (!canRequestFriend || requestingFriend) {
      return;
    }

    setRequestingFriend(true);

    try {
      await axiosInstance.post(endpoints.friend.new, {
        userId1: viewerId,
        userId2: String(customerId || '').trim(),
      });

      setRequestSent(true);
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : typeof (error as { message?: unknown })?.message === 'string'
            ? ((error as { message?: string }).message || '')
            : '';

      if (message.toLowerCase().includes('already exists')) {
        setRequestSent(true);
      }
    } finally {
      setRequestingFriend(false);
    }
  };

  return (
    <>
      <UniverseLandingHero
        universe={resolvedUniverse!}
        visitors={visitors}
        isFullScreen={isFullScreen}
        onToggleFullScreen={onToggleFullScreen}
        friendshipState={friendshipState}
        canRequestFriend={canRequestFriend}
        requestingFriend={requestingFriend}
        onRequestFriend={handleRequestFriend}
        customer={{
          id: customerId,
          name: customerName,
          avatarUrl: customerAvatarUrl,
        }}
        designType={designSpaceType}
        sx={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      />

      <UniverseLandingMySpace
        customerName={customerName}
        customerAvatarUrl={customerAvatarUrl}
        designType={designSpaceType}
        sectionCounts={mySpaceSectionCounts}
        sections={{
          ...(guestarea?.blog
            ? {
                'blogs-section': (
                  <UniverseLandingBlogs
                    blogs={sharedBlogViewItems}
                    blogsLoading={blogsLoading}
                    ownerCustomerId={customerId}
                    isOwner={isCurrentCustomer}
                    getBlogHref={(blog) => paths.universe.blog(customerId, blog.id)}
                  />
                ),
              }
            : {}),
          ...(allowVisitorSections
            ? {
                'albums-section': (
                  <UniverseLandingAlbums
                    albums={sharedAlbums}
                    albumsLoading={albumsLoading}
                    ownerUserId={customerId}
                    isOwner={isCurrentCustomer}
                    getAlbumHref={(album) => paths.universe.album(album.id)}
                  />
                ),
                ...(showDrawersSection
                  ? {
                      'drawers-section': (
                        <UniverseLandingDrawer
                          items={sharedDrawerItems}
                          loading={drawerLoading}
                          viewAllHref={
                            isCurrentCustomer ? paths.dashboard.drawer.root : undefined
                          }
                        />
                      ),
                    }
                  : {}),
                'collection-items-section': (
                  <UniverseLandingCollectionItems
                    customerId={customerId}
                    collections={sharedCollections}
                    viewAllHref={
                      isCurrentCustomer ? paths.dashboard.collections.root : undefined
                    }
                  />
                ),
                ...(showBookshelfSection
                  ? {
                      'bookshelf-section': (
                        <UniverseLandingBookshelf
                          ebooks={showBookshelfEbooks ? publicEbooks : []}
                          audiobooks={showBookshelfAudiobooks ? publicAudiobooks : []}
                          showEbooks={showBookshelfEbooks}
                          showAudiobooks={showBookshelfAudiobooks}
                          loading={ebooksLoading || audiobooksLoading}
                          isOwner={isCurrentCustomer}
                          ownerCustomerId={customerId}
                          viewerCustomerId={viewerId}
                          authenticated={authenticated}
                        />
                      ),
                    }
                  : {}),
              }
            : {}),
        }}
      />
    </>
  );
}
