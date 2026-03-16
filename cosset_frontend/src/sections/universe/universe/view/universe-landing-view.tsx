'use client';

import type { IAlbumItem } from 'src/types/album';
import type { IUniverseProps } from 'src/types/universe';

import { useMemo, useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import { getS3SignedUrl } from 'src/utils/helper';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { useGiftCount } from 'src/actions/gift';
import { useGetBlogs } from 'src/actions/blog';
import { useGetCollections } from 'src/actions/collection';
import { useGetUsers } from 'src/actions/user';
import { useGetGuestArea } from 'src/actions/guestarea';
import { createNotification } from 'src/actions/notification';
import { useAuthContext } from 'src/auth/hooks';

import { UniverseLandingHero } from '../landing/universe-landing-hero';
import { UniverseLandingAlbums } from '../landing/universe-landing-albums';
import { UniverseLandingBlogs } from '../landing/universe-landing-blogs';
import { UniverseLandingCollectionItems } from '../landing/universe-landing-collection-items';
import { UniverseLandingDrawer } from '../landing/universe-landing-drawer';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
  universe?: IUniverseProps;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
};

type VisitorItem = {
  id: string;
  name: string;
  avatarUrl: string;
};

export function UniverseLandingView({
  customerId,
  universe,
  isFullScreen = false,
  onToggleFullScreen,
}: Props) {
  const { guestarea } = useGetGuestArea(customerId);
  const { user, loading: userLoading, authenticated } = useAuthContext();
  const { users } = useGetUsers(100, 0, authenticated);
  const { blogs, blogsLoading } = useGetBlogs(customerId);
  const { collections } = useGetCollections(customerId);
  const [heroUrl, setHeroUrl] = useState('');
  const [customerName, setCustomerName] = useState('Customer');
  const [customerAvatarKey, setCustomerAvatarKey] = useState('');
  const [customerAvatarUrl, setCustomerAvatarUrl] = useState('');
  const [designGalleryUrls, setDesignGalleryUrls] = useState<string[]>([]);
  const [sharedAlbums, setSharedAlbums] = useState<(IAlbumItem & { signedCoverUrl?: string })[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);

  const giftCountData = useGiftCount(customerId, 'Public', 'gift');
  const goodMemoCountData = useGiftCount(customerId, 'Public', 'goodMemo');
  const sadMemoCountData = useGiftCount(customerId, 'Public', 'sadMemo');

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

  useEffect(() => {
    let mounted = true;

    const loadDesignSpaceGallery = async () => {
      try {
        const res = await axiosInstance.get(endpoints.designSpace.root, {
          params: { customerId },
        });

        const designSpaces =
          (res.data?.designSpaces ?? []) as Array<{ background?: string | null }>;

        const backgroundRaw = designSpaces[0]?.background || '';

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

        setDesignGalleryUrls(Array.from(new Set(resolvedUrls.filter(Boolean))));
      } catch (error) {
        console.error('Failed to load design space gallery for universe view', error);
        if (mounted) {
          setDesignGalleryUrls([]);
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
        title: `<p><strong>${visitorName}</strong> visited your customer area</p>`,
        content: `${visitorName} visited your customer area`,
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

            if (!coverKey) {
              return { ...album, signedCoverUrl: '' };
            }

            if (coverKey.startsWith('http://') || coverKey.startsWith('https://')) {
              return { ...album, signedCoverUrl: coverKey };
            }

            const signedCoverUrl = await getS3SignedUrl(coverKey);
            return { ...album, signedCoverUrl: signedCoverUrl || '' };
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

  const resolvedUniverse = useMemo<IUniverseProps | undefined>(() => {
    if (!guestarea) return universe;

    const now = new Date().toISOString();

    return {
      id: String(guestarea.id ?? customerId),
      name: guestarea.title || 'My Universe',
      heroUrl: heroUrl || '',
      coverUrl: heroUrl || '',
      mood: guestarea.mood || '',
      motif: guestarea.motif || '',
      duration: '',
      connections: 0,
      gallery: designGalleryUrls.length ? designGalleryUrls : heroUrl ? [heroUrl] : [],
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
  }, [customerId, designGalleryUrls, guestarea, heroUrl, universe]);

  const drawerSettings = useMemo(() => {
    if (!guestarea?.drawer) {
      return { gift: false, goodMemo: false, sadMemo: false, collectionItems: {} as Record<string, boolean> };
    }

    try {
      const parsed = JSON.parse(guestarea.drawer) as {
        gift?: boolean;
        goodMemo?: boolean;
        sadMemo?: boolean;
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
        goodMemo: !!parsed.goodMemo,
        sadMemo: !!parsed.sadMemo,
        collectionItems,
      };
    } catch {
      return { gift: false, goodMemo: false, sadMemo: false, collectionItems: {} as Record<string, boolean> };
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

  const drawerItems = useMemo(
    () => [
      {
        key: 'gift',
        label: 'Gifts and Souvenir',
        icon: 'solar:gift-bold',
        enabled: drawerSettings.gift,
        count: giftCountData.count,
        href: paths.universe.drawer.item(customerId, 'gift'),
      },
      {
        key: 'goodMemo',
        label: 'Good Memories',
        icon: 'solar:sun-bold',
        enabled: drawerSettings.goodMemo,
        count: goodMemoCountData.count,
        href: paths.universe.drawer.item(customerId, 'goodMemo'),
      },
      {
        key: 'sadMemo',
        label: 'Sad Memories',
        icon: 'solar:cloudy-bold',
        enabled: drawerSettings.sadMemo,
        count: sadMemoCountData.count,
        href: paths.universe.drawer.item(customerId, 'sadMemo'),
      },
    ],
    [
      customerId,
      drawerSettings.gift,
      drawerSettings.goodMemo,
      drawerSettings.sadMemo,
      giftCountData.count,
      goodMemoCountData.count,
      sadMemoCountData.count,
    ]
  );

  const sharedDrawerItems = drawerItems.filter((item) => item.enabled);
  const sharedBlogViewItems = guestarea?.blog ? sharedBlogs : [];

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
    goodMemoCountData.loading ||
    sadMemoCountData.loading;

  return (
    <>
      <UniverseLandingHero
        universe={resolvedUniverse!}
        visitors={visitors}
        isFullScreen={isFullScreen}
        onToggleFullScreen={onToggleFullScreen}
        customer={{
          id: customerId,
          name: customerName,
          avatarUrl: customerAvatarUrl,
        }}
      />

      <UniverseLandingBlogs
        blogs={sharedBlogViewItems}
        blogsLoading={guestarea?.blog ? blogsLoading : false}
        viewAllHref={paths.universe.blogs(customerId)}
        ownerCustomerId={customerId}
        getBlogHref={(blog) => paths.universe.blog(customerId, blog.id)}
      />

      <UniverseLandingAlbums
        albums={sharedAlbums}
        albumsLoading={albumsLoading}
        ownerUserId={customerId}
      />

      <UniverseLandingDrawer
        items={sharedDrawerItems}
        loading={drawerLoading}
        sx={{ px: { xs: 2, md: 0 }, py: { xs: 5, md: 8 } }}
      />  

      <UniverseLandingCollectionItems
        customerId={customerId}
        collections={sharedCollections}
      />

      
    </>
  );
}
