'use client';

import type { ReactNode } from 'react';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { Iconify } from 'src/components/universe/iconify';

import {
  type DesignSpaceType,
  DEFAULT_DESIGN_SPACE_TYPE,
  hasDistinctSidebar,
  getDesignSpaceTypeLabel,
} from 'src/utils/design-space-type';

import { MySpaceCountBadge } from './myspace-section-title';
import { DesignSpaceThemeProvider, useDesignSpaceTheme } from './design-space-theme-context';
import {
  getMyspaceSectionImageFallbackUrl,
  getMyspaceSectionImageUrl,
  type MyspaceSectionImageKey,
} from './myspace-section-images';

// ----------------------------------------------------------------------

const SIDEBAR_WIDTH = 320;

const CARD_RADIUS = 10;

const NAV_SECTIONS = [
  {
    id: 'blogs-section' as const,
    title: 'BLOGS',
    description: 'Thoughts, stories and ideas.',
    icon: 'solar:document-text-bold',
  },
  {
    id: 'albums-section' as const,
    title: 'ALBUMS',
    description: 'Photos, memories and moments.',
    icon: 'solar:album-bold',
  },
  {
    id: 'drawers-section' as const,
    title: 'DRAWERS',
    description: 'Private notes and daily bits.',
    icon: 'solar:box-bold',
  },
  {
    id: 'collection-items-section' as const,
    title: 'COLLECTIONS',
    description: 'Saved favorites and inspiration.',
    icon: 'solar:widget-4-bold',
  },
] as const;

export const MYSPACE_SECTION_IDS = NAV_SECTIONS.map((section) => section.id);

export type MySpaceSectionId = (typeof NAV_SECTIONS)[number]['id'];

function MySpaceSectionCardImage({ sectionId }: { sectionId: MyspaceSectionImageKey }) {
  const { designType } = useDesignSpaceTheme();
  const primarySrc = getMyspaceSectionImageUrl(designType, sectionId);
  const fallbackSrc = getMyspaceSectionImageFallbackUrl(sectionId);
  const [imageSrc, setImageSrc] = useState(primarySrc);

  useEffect(() => {
    setImageSrc(primarySrc);
  }, [primarySrc]);

  return (
    <Box
      component="img"
      src={imageSrc}
      alt=""
      onError={() => {
        if (imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc);
        }
      }}
      sx={{
        position: 'absolute',
        inset: 0,
        width: 1,
        height: 1,
        objectFit: 'cover',
      }}
    />
  );
}

// ----------------------------------------------------------------------

type Props = {
  header?: ReactNode;
  customerName: string;
  customerAvatarUrl?: string;
  designType?: DesignSpaceType;
  sections: Partial<Record<MySpaceSectionId, ReactNode>>;
  sectionCounts?: Partial<Record<MySpaceSectionId, number>>;
};

function MySpaceCustomerTitle({
  customerName,
  customerAvatarUrl,
  variant = 'sidebar',
}: {
  customerName: string;
  customerAvatarUrl?: string;
  variant?: 'sidebar' | 'mobile';
}) {
  const { designType, theme: spaceTheme } = useDesignSpaceTheme();
  const isSidebar = variant === 'sidebar';
  const useSidebarPalette = isSidebar && hasDistinctSidebar(spaceTheme);

  return (
    <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
        <Avatar
          src={customerAvatarUrl || undefined}
          alt={customerName}
          sx={{
            width: isSidebar ? 50 : 36,
            height: isSidebar ? 50 : 36,
            border: '2px solid',
            borderColor: useSidebarPalette
              ? 'rgba(255, 248, 240, 0.35)'
              : spaceTheme.surfaceBg,
            boxShadow: spaceTheme.isDark
              ? '0 2px 8px rgba(0, 0, 0, 0.35)'
              : '0 2px 8px rgba(60, 45, 30, 0.12)',
            flexShrink: 0,
            ...(spaceTheme.isDark || useSidebarPalette
              ? {
                  bgcolor: useSidebarPalette
                    ? 'rgba(255, 248, 240, 0.14)'
                    : spaceTheme.surfaceBg,
                  color: useSidebarPalette
                    ? spaceTheme.sidebarTextPrimary
                    : spaceTheme.textPrimary,
                }
              : {}),
          }}
        >
          {customerName.charAt(0)}
        </Avatar>

        <Typography
          variant={isSidebar ? 'h5' : 'h6'}
          noWrap
          sx={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontWeight: 500,
            minWidth: 0,
            color: useSidebarPalette ? spaceTheme.sidebarTextPrimary : 'inherit',
          }}
        >
          {`${customerName || 'My'}'s Space`}
        </Typography>
      </Stack>

      <Chip
        label={getDesignSpaceTypeLabel(designType)}
        size="small"
        sx={{
          alignSelf: 'flex-start',
          ml: isSidebar ? 7.5 : 5.5,
          height: 24,
          fontSize: '0.7rem',
          fontWeight: 600,
          ...(useSidebarPalette
            ? {
                bgcolor: 'rgba(255, 248, 240, 0.14)',
                color: spaceTheme.sidebarTextPrimary,
                border: '1px solid rgba(255, 255, 255, 0.22)',
              }
            : {
                bgcolor: spaceTheme.accentSoft,
                color: spaceTheme.accent,
                border: `1px solid ${spaceTheme.border}`,
              }),
        }}
      />
    </Stack>
  );
}

function MySpaceSidebar({
  activeSection,
  visibleSections,
  customerName,
  customerAvatarUrl,
  sectionCounts,
  onSelectSection,
  onNavigate,
}: {
  activeSection: MySpaceSectionId;
  visibleSections: (typeof NAV_SECTIONS)[number][];
  customerName: string;
  customerAvatarUrl?: string;
  sectionCounts?: Partial<Record<MySpaceSectionId, number>>;
  onSelectSection: (sectionId: MySpaceSectionId) => void;
  onNavigate?: () => void;
}) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const navTextShadow = '0 1px 4px rgba(0, 0, 0, 0.45)';

  return (
    <Stack
      sx={{
        width: 1,
        height: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexShrink: 0, pb: 2 }}
      >
      
        <MySpaceCustomerTitle
          customerName={customerName}
          customerAvatarUrl={customerAvatarUrl}
        />
      </Stack>

      <Stack
        spacing={1.5}
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          padding: 1.5,
          scrollbarWidth: 'thin',
        }}
        gap={2}
      >
        {visibleSections.map((section) => {
          const isActive = activeSection === section.id;

          return (
            <Box
              key={section.id}
              component="button"
              type="button"
              onClick={() => {
                onSelectSection(section.id);
                onNavigate?.();
              }}
              sx={{
                position: 'relative',
                width: 1,
                minHeight: 160,
                flexShrink: 0,
                p: 0,
                border: '2px solid',
                borderColor: isActive
                  ? 'primary.main'
                  : hasDistinctSidebar(spaceTheme)
                    ? 'rgba(255, 248, 240, 0.28)'
                    : spaceTheme.border,
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: `${CARD_RADIUS}px`,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: isActive
                  ? '0 8px 22px rgba(0, 0, 0, 0.22)'
                  : '0 4px 12px rgba(0, 0, 0, 0.25)',
                outline: 'none',
                transition: (theme) =>
                  theme.transitions.create(['box-shadow', 'transform'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 18px rgba(60, 45, 30, 0.12)',
                },
              }}
            >
              <MySpaceSectionCardImage sectionId={section.id} />

              <Stack
                sx={{
                  position: 'relative',
                  height: 1,
                  minHeight: 160,
                  p: 2,
                  color: spaceTheme.categoryTitleColor,
                  justifyContent: 'flex-end',
                }}
              >
                {typeof sectionCounts?.[section.id] === 'number' ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 10,
                      }}
                    >
                      <MySpaceCountBadge count={sectionCounts[section.id]!} size="sm" />
                    </Box>
                  ) : null}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: hasDistinctSidebar(spaceTheme)
                      ? 'rgba(255, 248, 240, 0.2)'
                      : spaceTheme.accentSoft,
                    backdropFilter: 'blur(4px)',
                    color: hasDistinctSidebar(spaceTheme)
                      ? spaceTheme.categoryTitleColor
                      : spaceTheme.accent,
                  }}
                >
                  <Iconify icon={section.icon} width={20} />
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    fontSize: '1.25rem',
                    color: spaceTheme.categoryTitleColor,
                    textShadow: navTextShadow,
                  }}
                >
                  {section.title}
                </Typography>

                <Box sx={{ position: 'relative', display: 'inline-block', pr: 3.5, mt: 0.25 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      lineHeight: 1.4,
                      color: spaceTheme.categorySubtitleColor,
                      textShadow: navTextShadow,
                      display: 'block',
                    }}
                  >
                    {section.description}
                  </Typography>
                </Box>

                <Iconify
                  icon="eva:arrow-ios-forward-fill"
                  width={18}
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 14,
                    color: spaceTheme.categoryTitleColor,
                    opacity: 0.9,
                    filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.45))',
                  }}
                />
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

export function UniverseLandingMySpace({
  sections,
  header,
  customerName,
  customerAvatarUrl,
  designType = DEFAULT_DESIGN_SPACE_TYPE,
  sectionCounts,
}: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <DesignSpaceThemeProvider designType={designType} withMuiTheme>
      <UniverseLandingMySpaceContent
        sections={sections}
        header={header}
        customerName={customerName}
        customerAvatarUrl={customerAvatarUrl}
        sectionCounts={sectionCounts}
        isDesktop={isDesktop}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
      />
    </DesignSpaceThemeProvider>
  );
}

function UniverseLandingMySpaceContent({
  sections,
  header,
  customerName,
  customerAvatarUrl,
  sectionCounts,
  isDesktop,
  mobileNavOpen,
  setMobileNavOpen,
}: Omit<Props, 'designType'> & {
  isDesktop: boolean;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}) {
  const { theme: spaceTheme } = useDesignSpaceTheme();

  const visibleSections = useMemo(
    () => NAV_SECTIONS.filter((section) => Boolean(sections[section.id])),
    [sections],
  );

  const [activeSection, setActiveSection] = useState<MySpaceSectionId>(
    visibleSections[0]?.id ?? 'blogs-section',
  );

  useEffect(() => {
    if (!visibleSections.some((section) => section.id === activeSection)) {
      setActiveSection(visibleSections[0]?.id ?? 'blogs-section');
    }
  }, [activeSection, visibleSections]);

  const handleSelectSection = (sectionId: MySpaceSectionId) => {
    setActiveSection(sectionId);

    const mainEl = document.getElementById('myspace-main-scroll');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const sidebar = (
    <MySpaceSidebar
      activeSection={activeSection}
      visibleSections={visibleSections}
      customerName={customerName}
      customerAvatarUrl={customerAvatarUrl}
      sectionCounts={sectionCounts}
      onSelectSection={handleSelectSection}
      onNavigate={() => {
        if (!isDesktop) {
          setMobileNavOpen(false);
        }
      }}
    />
  );

  const activeContent = sections[activeSection];

  return (
    <Box
      id="myspace-section"
      sx={{
        minHeight: '100dvh',
        height: '100dvh',
        bgcolor: spaceTheme.pageBg,
        color: spaceTheme.textPrimary,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        scrollMarginTop: 0,
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 0,
          px: { xs: 0, lg: 3 },
          py: { xs: 0, lg: 2 },
          height: 1,
        }}
      >
        {isDesktop ? (
          <Box
            component="aside"
            sx={{
              width: SIDEBAR_WIDTH,
              flexShrink: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: 1,
              mr: 2.5,
              bgcolor: spaceTheme.sidebarBg,
              color: spaceTheme.sidebarTextPrimary,
              borderRight: '1px solid',
              borderColor: spaceTheme.sidebarBorder,
              borderRadius: { lg: 2 },
            }}
          >
            {sidebar}
          </Box>
        ) : null}

        <Box
          component="main"
          id="myspace-main-scroll"
          sx={{
            flex: '1 1 auto',
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            bgcolor: spaceTheme.contentBg,
            borderRadius: 2,
            color: spaceTheme.textPrimary,
            px: { xs: 2, sm: 3, lg: 0 },
            pl: { lg: 0.5 },
            pb: 3,
            scrollbarWidth: 'thin',
          }}
        >
          {!isDesktop ? (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ pt: 2, pb: 1, flexShrink: 0 }}>
              <IconButton onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
                <Iconify icon="solar:hamburger-menu-linear" />
              </IconButton>
              <MySpaceCustomerTitle
                customerName={customerName}
                customerAvatarUrl={customerAvatarUrl}
                variant="mobile"
              />
            </Stack>
          ) : null}

          {header}

          <Box key={activeSection} sx={{ pt: header ? 0 : { xs: 0, lg: 1 } }}>
            {activeContent ?? (
              <Typography color="text.secondary" sx={{ py: 4 }}>
                No content available for this section.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={!isDesktop && mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        PaperProps={{
          sx: {
            width: SIDEBAR_WIDTH + 32,
            bgcolor: spaceTheme.sidebarBg,
            color: spaceTheme.sidebarTextPrimary,
            p: 2,
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {sidebar}
      </Drawer>
    </Box>
  );
}
