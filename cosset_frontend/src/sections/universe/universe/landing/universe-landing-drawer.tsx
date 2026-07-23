import type { BoxProps } from '@mui/material/Box';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/universe/iconify';

import {
  MySpaceSectionTitle,
} from './myspace-section-title';
import { myspaceItemCardSx, myspaceItemGridSx } from './myspace-item-layout';
import { useDesignSpaceTheme } from './design-space-theme-context';
import { UniverseLandingSectionEmpty } from './universe-landing-section-empty';

// ----------------------------------------------------------------------

export type DrawerSharedItem = {
  key: string;
  label: string;
  count: number;
  viewedCount?: number;
  unreadCount?: number;
  href?: string;
  icon?: string;
};

type Props = BoxProps & {
  items?: DrawerSharedItem[];
  loading?: boolean;
  viewAllHref?: string;
  isOwner?: boolean;
};

const DRAWER_CARD_THEMES: Record<
  string,
  { icon: string; iconColor: string; iconBg: string }
> = {
  goodMemo: {
    icon: 'solar:leaf-bold',
    iconColor: '#4CAF50',
    iconBg: '#E8F5E9',
  },
  letter: {
    icon: 'solar:lock-keyhole-minimalistic-bold',
    iconColor: '#8D6E63',
    iconBg: '#F5F0E8',
  },
  sadMemo: {
    icon: 'solar:checklist-minimalistic-bold',
    iconColor: '#42A5F5',
    iconBg: '#E3F2FD',
  },
  gift: {
    icon: 'solar:heart-bold',
    iconColor: '#E57373',
    iconBg: '#FCE4EC',
  },
};

const DEFAULT_THEME = {
  icon: 'solar:box-minimalistic-bold',
  iconColor: '#8D6E63',
  iconBg: '#F5F0E8',
};

const getDrawerTheme = (item: DrawerSharedItem) => {
  if (item.key && DRAWER_CARD_THEMES[item.key]) {
    const theme = DRAWER_CARD_THEMES[item.key];
    return {
      ...theme,
      icon: item.icon || theme.icon,
    };
  }

  return {
    ...DEFAULT_THEME,
    icon: item.icon || DEFAULT_THEME.icon,
  };
};

const getDrawerCountLabel = (item: DrawerSharedItem) => {
  const unit = item.key === 'gift' ? 'item' : 'note';
  const plural = item.count === 1 ? unit : `${unit}s`;

  return `${item.count} ${plural}`;
};

type DrawerCategoryCardProps = {
  item: DrawerSharedItem;
};

function DrawerCategoryCard({ item }: DrawerCategoryCardProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const theme = getDrawerTheme(item);
  const viewedCount = item.viewedCount ?? 0;
  const unreadCount = item.unreadCount ?? Math.max(0, item.count - viewedCount);

  const cardBody = (
    <Stack spacing={1.5} sx={{ p: 2, width: 1, height: 1 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            bgcolor: theme.iconBg,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Iconify icon={theme.icon} width={22} sx={{ color: theme.iconColor }} />
        </Box>

        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            noWrap
            sx={{ color: spaceTheme.textPrimary }}
          >
            {item.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getDrawerCountLabel(item)}
          </Typography>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Iconify icon="eva:eye-fill" width={14} sx={{ color: 'success.main' }} />
              <Typography variant="caption" color="text.secondary">
                {viewedCount} viewed
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Iconify icon="eva:eye-off-fill" width={14} sx={{ color: 'warning.main' }} />
              <Typography variant="caption" color="text.secondary">
                {unreadCount} unread
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Stack>

      {item.href ? (
        <Button
          component={RouterLink}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          variant="outlined"
          fullWidth
          sx={{
            borderRadius: 99,
            borderColor: spaceTheme.accent,
            color: spaceTheme.accent,
            fontWeight: 600,
            '&:hover': {
              borderColor: spaceTheme.accentHover,
              bgcolor: spaceTheme.accentSoft,
            },
          }}
        >
          View items
        </Button>
      ) : null}
    </Stack>
  );

  const cardSx = {
    height: 1,
    borderRadius: 2,
    overflow: 'hidden',
    bgcolor: spaceTheme.surfaceBg,
    border: `1px solid ${spaceTheme.border}`,
    boxShadow: spaceTheme.isDark
      ? '0 2px 10px rgba(0, 0, 0, 0.22)'
      : '0 2px 10px rgba(60, 45, 30, 0.05)',
    transition: (muiTheme: import('@mui/material/styles').Theme) =>
      muiTheme.transitions.create(['box-shadow', 'transform'], {
        duration: muiTheme.transitions.duration.shorter,
      }),
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 20px rgba(60, 45, 30, 0.08)',
    },
  };

  return <Card sx={cardSx}>{cardBody}</Card>;
}

export function UniverseLandingDrawer({
  items = [],
  loading = false,
  viewAllHref,
  isOwner = false,
  sx,
  ...other
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const totalItemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.count, 0),
    [items],
  );

  return (
    <Box
      id="drawers-section"
      component="section"
      sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, ...sx }}
      {...other}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
        >
          <Stack spacing={1} sx={{ maxWidth: 520 }}>
            <MySpaceSectionTitle
              title="DRAWERS"
              subtitle="Keepsakes, mementos, and meaningful shared moments."
              itemCount={totalItemCount}
            />
          </Stack>

          {viewAllHref ? (
            <Typography
              component={RouterLink}
              href={viewAllHref}
              variant="body2"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                whiteSpace: 'nowrap',
                '&:hover': { color: spaceTheme.accent },
              }}
            >
              View all
              <Iconify icon="eva:arrow-ios-forward-fill" width={14} />
            </Typography>
          ) : null}
        </Stack>

        {loading ? (
          <Typography color="text.secondary">Loading drawer items...</Typography>
        ) : items.length === 0 ? (
          <UniverseLandingSectionEmpty
            icon="solar:box-bold"
            title={isOwner ? 'Your drawer space is ready' : 'No shared drawer items yet'}
            comment={
              isOwner
                ? 'Add gifts, letters, and memos in Drawer, then share them from Things to Share so they appear here.'
                : 'This Cosset guest has not shared any drawer items yet. Check back soon.'
            }
            actionHref={isOwner ? paths.dashboard.homeSpace.thingsToShare : undefined}
            actionLabel={isOwner ? 'Manage sharing' : undefined}
            accentColor={spaceTheme.accent}
          />
        ) : (
          <Box sx={myspaceItemGridSx}>
            {items.map((item) => (
              <Box key={item.key} sx={myspaceItemCardSx}>
                <DrawerCategoryCard item={item} />
              </Box>
            ))}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
