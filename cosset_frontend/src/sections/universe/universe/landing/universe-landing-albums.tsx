import type { BoxProps } from '@mui/material/Box';
import type { IAlbumItem } from 'src/types/album';

import { useEffect, useMemo, useState } from 'react';

import { useGetViewedAlbumIds } from 'src/actions/album';
import { useGetReactionSummary } from 'src/actions/reaction';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import InputAdornment from '@mui/material/InputAdornment';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/universe/iconify';

import {
  MySpaceSectionTitle,
  MYSPACE_ITEM_TITLE_FONT,
} from './myspace-section-title';
import { myspaceItemCardSx, myspaceItemGridSx } from './myspace-item-layout';
import { useDesignSpaceTheme } from './design-space-theme-context';

// ----------------------------------------------------------------------

type AlbumItem = IAlbumItem & { signedCoverUrl?: string };

type Props = BoxProps & {
  albums: AlbumItem[];
  albumsLoading?: boolean;
  ownerUserId?: string | number;
  isOwner?: boolean;
  getAlbumHref?: (album: AlbumItem) => string;
};

const PAGE_SIZE = 6;

const formatAlbumDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
};

const getAlbumPhotoCount = (album: AlbumItem) => {
  const galleryCount = Number(album.imgCount ?? 0);
  const hasCover = Boolean((album.coverUrl || album.signedCoverUrl || '').trim());

  return galleryCount + (hasCover ? 1 : 0);
};

const getExcerpt = (album: AlbumItem) => {
  const source = (album.description || '').trim();
  if (!source) {
    return 'No description yet.';
  }

  return source.length > 72 ? `${source.slice(0, 72)}...` : source;
};

type AlbumCardProps = {
  album: AlbumItem;
  albumHref?: string;
  isViewed: boolean;
};

function AlbumCardHeart({ albumId }: { albumId: number }) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const { reactionSummary } = useGetReactionSummary('album', albumId);
  const count = reactionSummary?.totalCount ?? 0;

  return (
    <IconButton
      size="small"
      aria-label="Reactions"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      sx={{
        position: 'relative',
        width: 32,
        height: 32,
        bgcolor: spaceTheme.accent,
        color: 'common.white',
        boxShadow: `0 2px 8px ${spaceTheme.accentSoft}`,
        '&:hover': { bgcolor: spaceTheme.accentHover },
      }}
    >
      <Iconify icon="solar:heart-bold" width={16} />
      {count > 0 ? (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            px: 0.5,
            borderRadius: 99,
            bgcolor: 'background.paper',
            color: spaceTheme.accent,
            fontSize: 10,
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
            boxShadow: 1,
          }}
        >
          {count}
        </Box>
      ) : null}
    </IconButton>
  );
}

function UniverseLandingAlbumCard({ album, albumHref, isViewed }: AlbumCardProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const title = (album.title || '').trim() || `Album #${album.id}`;
  const coverUrl = album.signedCoverUrl || album.coverUrl || '';

  const cardBody = (
    <>
      <Box sx={{ position: 'relative', px: 1.5, pt: 1.5 }}>
        <Box
          sx={{
            position: 'relative',
            minHeight: 150,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid rgba(139, 119, 101, 0.14)',
            bgcolor: 'grey.200',
          }}
        >
          {coverUrl ? (
            <Box
              component="img"
              src={coverUrl}
              alt={title}
              sx={{
                width: 1,
                height: 180,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ minHeight: 150, color: 'text.disabled' }}
            >
              <Iconify icon="solar:album-bold" width={36} />
            </Stack>
          )}

          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <AlbumCardHeart albumId={album.id} />
          </Box>

          {!isViewed ? (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                width: 8,
                height: 10,
                borderRadius: '2px 2px 4px 4px',
                bgcolor: 'error.main',
                zIndex: 1,
              }}
            />
          ) : null}
        </Box>
      </Box>

      <Stack spacing={0.75} sx={{ p: 2, pt: 1.5, flex: 1, position: 'relative' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: MYSPACE_ITEM_TITLE_FONT,
              fontWeight: 700,
              fontSize: '1.05rem',
              lineHeight: 1.35,
              minWidth: 0,
              color: spaceTheme.textPrimary,
            }}
            noWrap
          >
            {title}
          </Typography>
          <Stack
            direction="row"
            spacing={0.35}
            alignItems="center"
            sx={{ flexShrink: 0, color: 'text.secondary' }}
          >
            <Iconify icon="solar:gallery-bold" width={16} sx={{ color: spaceTheme.accent }} />
            <Typography variant="caption" fontWeight={700}>
              {getAlbumPhotoCount(album)} Photos
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Iconify icon="solar:calendar-minimalistic-bold" width={14} sx={{ color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            {formatAlbumDate(album.createdAt)}
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
            flex: 1,
          }}
        >
          {getExcerpt(album)}
        </Typography>

        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 0.5 }}>
          <Iconify
            icon="solar:flower-bold-duotone"
            width={22}
            sx={{ color: spaceTheme.accent, opacity: 0.75 }}
          />
        </Stack>
      </Stack>
    </>
  );

  const cardSx = {
    height: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 2.5,
    overflow: 'hidden',
    bgcolor: spaceTheme.cardBg,
    boxShadow: spaceTheme.isDark
      ? '0 4px 18px rgba(0, 0, 0, 0.28)'
      : '0 4px 18px rgba(60, 45, 30, 0.08)',
    border: `1px solid ${spaceTheme.border}`,
    transition: (theme: import('@mui/material/styles').Theme) =>
      theme.transitions.create(['transform', 'box-shadow'], {
        duration: theme.transitions.duration.shorter,
      }),
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 10px 28px rgba(60, 45, 30, 0.12)',
    },
  };

  if (!albumHref) {
    return <Card sx={cardSx}>{cardBody}</Card>;
  }

  return (
    <Card sx={cardSx}>
      <CardActionArea
        component={RouterLink}
        href={albumHref}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ height: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        {cardBody}
      </CardActionArea>
    </Card>
  );
}

export function UniverseLandingAlbums({
  albums,
  albumsLoading = false,
  ownerUserId,
  isOwner = false,
  getAlbumHref,
  sx,
  ...other
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const { viewedAlbumIds } = useGetViewedAlbumIds(ownerUserId);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const viewedIdSet = useMemo(() => new Set(viewedAlbumIds.map(String)), [viewedAlbumIds]);

  const sortedAlbums = useMemo(
    () =>
      [...albums].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [albums],
  );

  const filteredAlbums = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sortedAlbums;
    }

    return sortedAlbums.filter((album) => {
      const searchable = [album.title, album.description, album.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [searchQuery, sortedAlbums]);

  const pageCount = Math.max(1, Math.ceil(filteredAlbums.length / PAGE_SIZE));

  const paginatedAlbums = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAlbums.slice(start, start + PAGE_SIZE);
  }, [filteredAlbums, page, pageCount]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const resolveAlbumHref = (album: AlbumItem) =>
    getAlbumHref?.(album) ?? paths.universe.album(album.id);

  return (
    <Box
      id="albums-section"
      component="section"
      sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, ...sx }}
      {...other}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
        >
          <Stack spacing={1} sx={{ maxWidth: 520 }}>
            <MySpaceSectionTitle
              title="ALBUMS"
              subtitle="Memory frames and snapshots shared with visitors."
              itemCount={sortedAlbums.length}
            />
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: 1, md: 'auto' } }}
          >
            <TextField
              size="small"
              placeholder="Search albums..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              sx={{
                minWidth: { sm: 240 },
                bgcolor: 'background.paper',
                borderRadius: 99,
                '& .MuiOutlinedInput-root': { borderRadius: 99 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            {isOwner ? (
              <Button
                component={RouterLink}
                href={paths.dashboard.album.new}
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                sx={{
                  borderRadius: 99,
                  px: 2.5,
                  whiteSpace: 'nowrap',
                  bgcolor: spaceTheme.accent,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: spaceTheme.accentHover, boxShadow: 'none' },
                }}
              >
                New Album
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {albumsLoading ? (
          <Typography color="text.secondary">Loading albums...</Typography>
        ) : filteredAlbums.length === 0 ? (
          <Typography color="text.secondary">
            {searchQuery.trim() ? 'No albums match your search.' : 'No shared albums found.'}
          </Typography>
        ) : (
          <>
            <Box sx={myspaceItemGridSx}>
              {paginatedAlbums.map((album) => (
                <Box key={album.id} sx={myspaceItemCardSx}>
                  <UniverseLandingAlbumCard
                    album={album}
                    albumHref={resolveAlbumHref(album)}
                    isViewed={viewedIdSet.has(String(album.id))}
                  />
                </Box>
              ))}
            </Box>

            {pageCount > 1 ? (
              <Stack alignItems="center" sx={{ pt: 1 }}>
                <Pagination
                  count={pageCount}
                  page={Math.min(page, pageCount)}
                  onChange={(_, value) => setPage(value)}
                  shape="rounded"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 600,
                    },
                    '& .Mui-selected': {
                      bgcolor: `${spaceTheme.accent} !important`,
                      color: 'common.white',
                    },
                  }}
                />
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </Box>
  );
}
