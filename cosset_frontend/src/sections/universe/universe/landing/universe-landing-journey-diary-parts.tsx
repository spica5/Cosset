'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { Iconify } from 'src/components/universe/iconify';

import { useDesignSpaceTheme } from './design-space-theme-context';
import { MySpaceCountBadge, MYSPACE_ITEM_TITLE_FONT } from './myspace-section-title';
import {
  type JourneyDiaryNavSection,
  type JourneyDiaryNavCategory,
} from './universe-landing-journey-diary-theme';
import { JOURNEY_DIARY_TITLE, JOURNEY_DIARY_SUBTITLE, JOURNEY_DIARY_SIDEBAR_TAGLINE } from './universe-landing-journey-diary-theme';
import {
  type JourneyDiaryEntry,
  journeyDiaryDateBadgeSx,
  JOURNEY_ENTRY_IMAGE_GRADIENT,
} from './universe-landing-journey-diary-utils';

// ----------------------------------------------------------------------

const KIND_ICONS = {
  picture: 'solar:gallery-bold',
  note: 'solar:notebook-bold',
  memorial: 'solar:heart-bold',
} as const;

export function JourneyDiarySidebarTitle() {
  const { theme: spaceTheme } = useDesignSpaceTheme();

  return (
    <Box sx={{ position: 'relative', flexShrink: 0, pb: 2.5, pr: 1 }}>
      <Iconify
        icon="solar:star-bold"
        width={12}
        sx={{
          position: 'absolute',
          top: 4,
          right: 52,
          color: spaceTheme.accent,
          opacity: 0.85,
        }}
      />
      <Iconify
        icon="solar:star-bold"
        width={8}
        sx={{
          position: 'absolute',
          top: 18,
          right: 38,
          color: spaceTheme.sidebarTextPrimary,
          opacity: 0.55,
        }}
      />
      <Iconify
        icon="solar:star-bold"
        width={10}
        sx={{
          position: 'absolute',
          top: 2,
          left: '58%',
          color: spaceTheme.accent,
          opacity: 0.65,
        }}
      />

      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontFamily: spaceTheme.decorativeFont || '"Georgia", "Times New Roman", serif',
              fontWeight: spaceTheme.decorativeFont ? 400 : 600,
              fontSize: spaceTheme.decorativeFont ? { xs: '1.85rem', md: '2.1rem' } : { xs: '1.5rem', md: '1.75rem' },
              lineHeight: 1.1,
              color: spaceTheme.sidebarTextPrimary,
            }}
          >
            {JOURNEY_DIARY_TITLE}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              mt: 0.75,
              color: spaceTheme.sidebarTextSecondary,
              fontSize: '0.82rem',
              lineHeight: 1.45,
            }}
          >
            {JOURNEY_DIARY_SIDEBAR_TAGLINE}
          </Typography>

          <Box
            sx={{
              mt: 1.25,
              height: 2,
              width: 112,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${spaceTheme.accent} 0%, ${spaceTheme.accentSoft} 55%, transparent 100%)`,
              opacity: 0.9,
            }}
          />
        </Box>

        <Box
          sx={{
            mt: 0.25,
            flexShrink: 0,
            color: spaceTheme.accent,
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
          }}
        >
          <Iconify icon="solar:plain-2-bold" width={28} sx={{ transform: 'rotate(-18deg)' }} />
        </Box>
      </Stack>
    </Box>
  );
}

type CustomerHeaderProps = {
  customerName: string;
  customerAvatarUrl?: string;
};

export function JourneyDiaryCustomerHeader({
  customerName,
  customerAvatarUrl,
}: CustomerHeaderProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const displayName = (customerName || 'Friend').trim();
  const firstName = displayName.split(/\s+/)[0] || displayName;

  return (
    <Stack spacing={0.75} sx={{ flexShrink: 0, pb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
        <Avatar
          src={customerAvatarUrl || undefined}
          alt={displayName}
          sx={{
            width: 50,
            height: 50,
            flexShrink: 0,
            border: '2px solid',
            borderColor: spaceTheme.border,
            bgcolor: spaceTheme.accentSoft,
            color: spaceTheme.accent,
            boxShadow: spaceTheme.isDark
              ? '0 2px 8px rgba(0, 0, 0, 0.35)'
              : '0 2px 8px rgba(60, 45, 30, 0.12)',
          }}
        >
          {displayName.charAt(0)}
        </Avatar>

        <Typography
          variant="h6"
          noWrap
          sx={{
            minWidth: 0,
            fontFamily: spaceTheme.decorativeFont || MYSPACE_ITEM_TITLE_FONT,
            fontWeight: spaceTheme.decorativeFont ? 500 : 700,
            color: spaceTheme.sidebarTextPrimary,
          }}
        >
          Hello, {firstName}!
        </Typography>
      </Stack>

      <Typography
        variant="caption"
        sx={{
          pl: 7.5,
          color: spaceTheme.sidebarTextSecondary,
          lineHeight: 1.45,
        }}
      >
        {JOURNEY_DIARY_SUBTITLE}
      </Typography>
    </Stack>
  );
}

type SidebarProps = {
  sections: JourneyDiaryNavSection[];
  activeCategory: JourneyDiaryNavCategory;
  counts: Partial<Record<JourneyDiaryNavCategory, number>>;
  onSelectCategory: (category: JourneyDiaryNavCategory) => void;
  onNavigate?: () => void;
};

export function JourneyDiaryCategorySidebar({
  sections,
  activeCategory,
  counts,
  onSelectCategory,
  onNavigate,
}: SidebarProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();

  return (
    <Stack
      spacing={0.75}
      sx={{
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        pr: 0.5,
        scrollbarWidth: 'thin',
      }}
    >
      {sections.map((section) => {
        const isActive = activeCategory === section.id;
        const label = section.title
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return (
          <Box
            key={section.id}
            component="button"
            type="button"
            onClick={() => {
              onSelectCategory(section.id);
              onNavigate?.();
            }}
            sx={{
              width: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.5,
              py: 1.15,
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
              textAlign: 'left',
              bgcolor: isActive ? spaceTheme.accentSoft : 'transparent',
              color: spaceTheme.sidebarTextPrimary,
              outline: 'none',
              transition: (theme) =>
                theme.transitions.create(['background-color', 'transform'], {
                  duration: theme.transitions.duration.shorter,
                }),
              '&:hover': {
                bgcolor: isActive ? spaceTheme.accentSoft : 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: isActive ? spaceTheme.surfaceBg : 'transparent',
                color: isActive ? spaceTheme.accent : spaceTheme.sidebarTextSecondary,
              }}
            >
              <Iconify icon={section.icon} width={18} />
            </Box>

            <Typography
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.95rem',
                color: spaceTheme.sidebarTextPrimary,
                fontFamily: spaceTheme.decorativeFont || 'inherit',
              }}
              noWrap
            >
              {label}
            </Typography>

            {typeof counts[section.id] === 'number' ? (
              <MySpaceCountBadge count={counts[section.id]!} size="sm" />
            ) : null}
          </Box>
        );
      })}
    </Stack>
  );
}

type EntryCardProps = {
  entry: JourneyDiaryEntry;
  onClick: () => void;
};

export function JourneyDiaryEntryCard({ entry, onClick }: EntryCardProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const fallbackIcon = KIND_ICONS[entry.kind];

  return (
    <Card
      elevation={0}
      sx={{
        height: 1,
        borderRadius: 2.5,
        overflow: 'hidden',
        border: `1px solid ${spaceTheme.isDark ? spaceTheme.border : 'rgba(139, 119, 101, 0.14)'}`,
        bgcolor: spaceTheme.surfaceBg,
        boxShadow: spaceTheme.isDark
          ? '0 8px 24px rgba(0,0,0,0.22)'
          : '0 8px 24px rgba(60, 45, 30, 0.08)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: spaceTheme.isDark
            ? '0 12px 28px rgba(0,0,0,0.28)'
            : '0 12px 28px rgba(60, 45, 30, 0.12)',
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ position: 'relative', px: 1.5, pt: 1.5 }}>
          <Box
            sx={{
              position: 'relative',
              minHeight: 150,
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${spaceTheme.isDark ? spaceTheme.border : 'rgba(139, 119, 101, 0.14)'}`,
              bgcolor: spaceTheme.isDark ? 'rgba(255,255,255,0.06)' : 'grey.200',
            }}
          >
            {entry.imageUrl ? (
              <Box
                component="img"
                src={entry.imageUrl}
                alt={entry.title}
                sx={{ width: 1, height: 1, minHeight: 150, objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{ minHeight: 150, color: spaceTheme.textSecondary }}
              >
                <Iconify icon={fallbackIcon} width={32} />
              </Stack>
            )}

            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: JOURNEY_ENTRY_IMAGE_GRADIENT,
                pointerEvents: 'none',
              }}
            />

            {entry.dateLabel ? (
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  ...journeyDiaryDateBadgeSx(),
                }}
              >
                {entry.dateLabel}
              </Box>
            ) : null}

            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: spaceTheme.accent,
                color: 'common.white',
                boxShadow: `0 2px 8px ${spaceTheme.accentSoft}`,
              }}
            >
              <Iconify icon="solar:bookmark-bold" width={14} />
            </Box>
          </Box>
        </Box>

        <Stack spacing={0.75} sx={{ p: 2, pt: 1.5, width: 1, flex: 1 }}>
          <Typography
            sx={{
              fontFamily: MYSPACE_ITEM_TITLE_FONT,
              fontWeight: 700,
              fontSize: '1.05rem',
              lineHeight: 1.35,
              color: spaceTheme.textPrimary,
            }}
            noWrap
          >
            {entry.title}
          </Typography>

          <Typography variant="caption" sx={{ color: spaceTheme.textSecondary, fontWeight: 600 }}>
            {entry.subtitle}
          </Typography>

          {entry.excerpt ? (
            <Typography
              variant="body2"
              sx={{
                color: spaceTheme.textSecondary,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.5,
              }}
            >
              {entry.excerpt}
            </Typography>
          ) : null}
        </Stack>
      </CardActionArea>
    </Card>
  );
}
