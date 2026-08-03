'use client';

import type { CardProps } from '@mui/material/Card';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';

import { useAuthContext } from 'src/auth/hooks';

import { useGetBlogs } from 'src/actions/blog';
import { useGetAlbums } from 'src/actions/album';
import { useGetGifts } from 'src/actions/gift';
import { useGetCollections } from 'src/actions/collection';
import { useGetCollectionItems, useGetCollectionsItemsCount } from 'src/actions/collection-item';
import { useGetBookshelfEbooks } from 'src/actions/bookshelf-ebook';
import { useGetBookshelfAudiobooks } from 'src/actions/bookshelf-audiobook';
import { useGetJourneyDiaryNotes } from 'src/actions/journey-diary-note';
import { useGetJourneyMemorialThings } from 'src/actions/journey-diary-memorial-thing';
import { useGetJourneyRepresentativePictures } from 'src/actions/journey-diary-representative-picture';

import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

const LETTER_COLLECTION_ID = 4;
const GOOD_MEMO_COLLECTION_ID = 1;
const SAD_MEMO_COLLECTION_ID = 2;

type StatCardProps = CardProps & {
  title: string;
  total: number;
  loading?: boolean;
  icon: string;
  color: string;
  href: string;
  details?: string;
};

function OverviewStatCard({
  title,
  total,
  loading = false,
  icon,
  color,
  href,
  details,
  sx,
  ...other
}: StatCardProps) {
  const theme = useTheme();

  return (
    <Card
      component={RouterLink}
      href={href}
      sx={{
        p: 2.5,
        height: 1,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: theme.transitions.create(['box-shadow', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.customShadows?.z8 || theme.shadows[4],
        },
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          flexShrink: 0,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(color, 0.12),
          color,
        }}
      >
        <Iconify icon={icon} width={26} />
      </Box>

      <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" noWrap>
          {title}
        </Typography>

        {loading ? (
          <Skeleton width={64} height={36} />
        ) : (
          <Typography variant="h3">{fNumber(total)}</Typography>
        )}

        {details ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            {details}
          </Typography>
        ) : null}
      </Stack>

      <Iconify
        icon="eva:arrow-ios-forward-fill"
        width={18}
        sx={{ color: 'text.disabled', flexShrink: 0 }}
      />
    </Card>
  );
}

export function OverviewContentStats() {
  const { user } = useAuthContext();
  const userId = user?.id ? String(user.id) : '';

  const { blogs, blogsLoading } = useGetBlogs(userId || undefined);
  const { albums, albumsLoading } = useGetAlbums(userId || undefined);
  const { gifts, giftsLoading } = useGetGifts(userId || undefined);
  const { collectionItems: letters, collectionItemsLoading: lettersLoading } = useGetCollectionItems(
    userId ? LETTER_COLLECTION_ID : '',
    userId,
  );
  const { collectionItems: goodMemos, collectionItemsLoading: goodMemosLoading } =
    useGetCollectionItems(userId ? GOOD_MEMO_COLLECTION_ID : '', userId);
  const { collectionItems: sadMemos, collectionItemsLoading: sadMemosLoading } =
    useGetCollectionItems(userId ? SAD_MEMO_COLLECTION_ID : '', userId);
  const { collections, collectionsLoading } = useGetCollections(userId || undefined);
  const collectionIds = useMemo(() => collections.map((collection) => collection.id), [collections]);
  const { collectionItemsTotal, collectionItemsTotalLoading } = useGetCollectionsItemsCount(
    collectionIds,
    userId || undefined,
  );
  const firstCollectionHref = useMemo(() => {
    if (!collections.length) {
      return paths.dashboard.collections.manage;
    }

    const [firstCollection] = [...collections].sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return (a.name || '').localeCompare(b.name || '');
    });

    return paths.dashboard.collections.items(firstCollection.id);
  }, [collections]);
  const { ebooks, ebooksLoading } = useGetBookshelfEbooks(userId || null);
  const { audiobooks, audiobooksLoading } = useGetBookshelfAudiobooks(userId || null);
  const { pictures, picturesLoading } = useGetJourneyRepresentativePictures(userId || undefined);
  const { notes, notesLoading } = useGetJourneyDiaryNotes(userId || undefined);
  const { memorialThings, memorialThingsLoading } = useGetJourneyMemorialThings(
    userId || undefined,
  );

  const drawersTotal = gifts.length + letters.length + goodMemos.length + sadMemos.length;
  const drawersLoading = giftsLoading || lettersLoading || goodMemosLoading || sadMemosLoading;

  const bookshelfTotal = ebooks.length + audiobooks.length;
  const bookshelfLoading = ebooksLoading || audiobooksLoading;

  const journeyTotal = pictures.length + notes.length + memorialThings.length;
  const journeyLoading = picturesLoading || notesLoading || memorialThingsLoading;

  const collectionsCardLoading = collectionsLoading || collectionItemsTotalLoading;

  const stats = [
    {
      title: 'Blogs',
      total: blogs.length,
      loading: blogsLoading,
      icon: 'solar:document-text-bold-duotone',
      color: '#2065D1',
      href: paths.dashboard.blog.list,
      details: `${blogs.length} published entries`,
    },
    {
      title: 'Albums',
      total: albums.length,
      loading: albumsLoading,
      icon: 'solar:gallery-bold-duotone',
      color: '#00A76F',
      href: paths.dashboard.album.root,
      details: `${albums.length} photo albums`,
    },
    {
      title: 'Drawers',
      total: drawersTotal,
      loading: drawersLoading,
      icon: 'solar:widget-5-bold-duotone',
      color: '#8E33FF',
      href: paths.dashboard.drawer.gift.root,
      details: `${gifts.length} gifts · ${letters.length} letters · ${goodMemos.length + sadMemos.length} memories`,
    },
    {
      title: 'Collections',
      total: collections.length,
      loading: collectionsCardLoading,
      icon: 'solar:folder-with-files-bold-duotone',
      color: '#FFAB00',
      href: firstCollectionHref,
      details: `${collections.length} collections · ${collectionItemsTotal} items`,
    },
    {
      title: 'Bookshelf',
      total: bookshelfTotal,
      loading: bookshelfLoading,
      icon: 'solar:book-bookmark-bold-duotone',
      color: '#FF5630',
      href: paths.dashboard.bookshelf.ebooks,
      details: `${ebooks.length} e-books · ${audiobooks.length} audio-books`,
    },
    {
      title: 'Journey Diary',
      total: journeyTotal,
      loading: journeyLoading,
      icon: 'solar:map-point-wave-bold-duotone',
      color: '#078DEE',
      href: paths.dashboard.journeyDiary.myJourney,
      details: `${pictures.length} memories · ${notes.length} notes · ${memorialThings.length} memorial`,
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack spacing={0.35}>
        <Typography variant="h5">Your content</Typography>
        <Typography variant="body2" color="text.secondary">
          Quick counts across blogs, albums, drawers, collections, bookshelf, and journey diary.
        </Typography>
      </Stack>

      <Grid container spacing={2.5}>
        {stats.map((stat) => (
          <Grid key={stat.title} xs={12} sm={6} md={4}>
            <OverviewStatCard {...stat} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
