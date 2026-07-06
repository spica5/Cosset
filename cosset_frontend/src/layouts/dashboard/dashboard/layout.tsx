'use client';

import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';
import type { NavSectionProps, NavItemBaseProps } from 'src/components/dashboard/nav-section';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { iconButtonClasses } from '@mui/material/IconButton';

import { useBoolean } from 'src/hooks/use-boolean';

import { useGetCollections } from 'src/actions/collection';
import { useGetMailUnreadCount } from 'src/actions/mail';
import { useGetNotifications } from 'src/actions/notification';
import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';
import { useMailNotifications } from 'src/hooks/use-mail-notifications';

import { Logo } from 'src/components/dashboard/logo';
import { Label } from 'src/components/dashboard/label';
import { useSettingsContext } from 'src/components/dashboard/settings';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';

import { Main } from './main';
import { NavMobile } from './nav-mobile';
import { layoutClasses } from '../classes';
import { NavVertical } from './nav-vertical';
import { NavHorizontal } from './nav-horizontal';
import { _account } from '../config-nav-account';
import { MenuButton } from '../components/menu-button';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';
import { StyledDivider, useNavColorVars } from './styles';
import { AccountDrawer } from '../components/account-drawer';
import { ContactsPopover } from '../components/contacts-popover';
import { navData as dashboardNavData } from '../config-nav-dashboard';
import { NotificationsDrawer } from '../components/notifications-drawer';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

const COFFEE_SHOP_HEADER_ICON_SX: SxProps<Theme> = {
  width: 40,
  height: 40,
  border: '1px solid rgba(255, 248, 240, 0.88)',
  borderRadius: '50%',
  color: '#FFF8F0',
  bgcolor: 'rgba(10, 8, 6, 0.35)',
  backdropFilter: 'blur(6px)',
  '&:hover': {
    bgcolor: 'rgba(10, 8, 6, 0.5)',
    borderColor: '#FFFFFF',
  },
};

export type DashboardLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
  data?: {
    nav?: NavSectionProps['data'];
  };
};

export function DashboardLayout({ sx, children, header, data }: DashboardLayoutProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const { user } = useAuthContext();

  const isCoffeeShopPage = pathname?.includes('/community/coffee-shop');
  const coffeeShopHeaderIconSx = isCoffeeShopPage ? COFFEE_SHOP_HEADER_ICON_SX : undefined;

  const mobileNavOpen = useBoolean();
  const { notifications } = useGetNotifications(user?.id ? String(user.id) : undefined);
  const { collections } = useGetCollections(user?.id ? String(user.id) : undefined);
  const userId = user?.id ? String(user.id) : undefined;
  const { unreadCount: mailUnreadCount } = useGetMailUnreadCount(Boolean(userId));
  useMailNotifications(userId);

  const settings = useSettingsContext();

  const navColorVars = useNavColorVars(theme, settings);

  const layoutQuery: Breakpoint = 'lg';

  const collectionSubitems = useMemo<NavItemBaseProps[]>(
    () => 
     [...collections]
      .sort((a, b) => {
        const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        return (a.name || '').localeCompare(b.name || '');
      })
      .map((collection) => ({
        title: `${collection.name || 'Collection'}`,
        path: paths.dashboard.collections.items(collection.id),
      })),
   [collections]);

  const navData = useMemo<NavSectionProps['data']>(() => {
    const baseNavData = data?.nav ?? dashboardNavData;
    const visibleNavData = isUserAdmin(user?.role)
      ? baseNavData
      : baseNavData.filter((group) => group.subheader !== 'Admin');

    return visibleNavData.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.title === 'Collections' && item.children) {
          return {
            ...item,
            children: [...item.children, ...collectionSubitems],
          };
        }

        if (item.title === 'Mail') {
          return {
            ...item,
            info:
              mailUnreadCount > 0 ? (
                <Label color="error" variant="inverted">
                  {mailUnreadCount}
                </Label>
              ) : undefined,
          };
        }

        return item;
      }),
    }));
  }, [data?.nav, collectionSubitems, mailUnreadCount, user?.role]);

  const isNavMini = settings.navLayout === 'mini';
  const isNavHorizontal = settings.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.navLayout === 'vertical';

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={
        <HeaderSection
          layoutQuery={layoutQuery}
          disableElevation={isNavVertical}
          slotProps={{
            toolbar: {
              sx: {
                ...(isNavHorizontal && {
                  bgcolor: 'var(--layout-nav-bg)',
                  [`& .${iconButtonClasses.root}`]: {
                    color: 'var(--layout-nav-text-secondary-color)',
                  },
                  [theme.breakpoints.up(layoutQuery)]: {
                    height: 'var(--layout-nav-horizontal-height)',
                  },
                }),
              },
            },
            container: {
              maxWidth: false,
              sx: {
                ...(isNavVertical && { px: { [layoutQuery]: 5 } }),
              },
            },
          }}
          sx={header?.sx}
          slots={{
            topArea: (
              <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                This is an info Alert.
              </Alert>
            ),
            bottomArea: isNavHorizontal ? (
              <NavHorizontal
                data={navData}
                layoutQuery={layoutQuery}
                cssVars={navColorVars.section}
              />
            ) : null,
            leftArea: (
              <>
                {/* -- Nav mobile -- */}
                <MenuButton
                  onClick={mobileNavOpen.onTrue}
                  sx={{
                    mr: 1,
                    ml: -1,
                    [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
                  }}
                />
                <NavMobile
                  data={navData}
                  open={mobileNavOpen.value}
                  onClose={mobileNavOpen.onFalse}
                  cssVars={navColorVars.section}
                />
                {/* -- Logo -- */}
                {isNavHorizontal && (
                  <Logo
                    sx={{
                      display: 'none',
                      [theme.breakpoints.up(layoutQuery)]: { display: 'inline-flex' },
                    }}
                  />
                )}
                {/* -- Divider -- */}
                {isNavHorizontal && (
                  <StyledDivider
                    sx={{ [theme.breakpoints.up(layoutQuery)]: { display: 'flex' } }}
                  />
                )}
              </>
            ),
            rightArea: (
              <Box display="flex" alignItems="center" gap={{ xs: 0, sm: 0.75 }}>
                {/* -- Notifications popover -- */}
                <NotificationsDrawer
                  data={notifications}
                  customerId={user?.id ? String(user.id) : undefined}
                  sx={coffeeShopHeaderIconSx}
                />
                {/* -- Contacts popover -- */}
                <ContactsPopover sx={coffeeShopHeaderIconSx} />
                {/* -- Account drawer -- */}
                <AccountDrawer data={_account} sx={coffeeShopHeaderIconSx} />
              </Box>
            ),
          }}
        />
      }
      /** **************************************
       * Sidebar
       *************************************** */
      sidebarSection={
        isNavHorizontal ? null : (
          <NavVertical
            data={navData}
            isNavMini={isNavMini}
            layoutQuery={layoutQuery}
            cssVars={navColorVars.section}
            onToggleNav={() =>
              settings.onUpdateField(
                'navLayout',
                settings.navLayout === 'vertical' ? 'mini' : 'vertical'
              )
            }
          />
        )
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      cssVars={{
        ...navColorVars.layout,
        '--layout-transition-easing': 'linear',
        '--layout-transition-duration': '120ms',
        '--layout-nav-mini-width': '88px',
        '--layout-nav-vertical-width': '300px',
        '--layout-nav-horizontal-height': '64px',
        '--layout-dashboard-content-pt': theme.spacing(1),
        '--layout-dashboard-content-pb': theme.spacing(8),
        '--layout-dashboard-content-px': theme.spacing(5),
      }}
      sx={{
        [`& .${layoutClasses.hasSidebar}`]: {
          [theme.breakpoints.up(layoutQuery)]: {
            transition: theme.transitions.create(['padding-left'], {
              easing: 'var(--layout-transition-easing)',
              duration: 'var(--layout-transition-duration)',
            }),
            pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
          },
        },
        ...sx,
      }}
    >
      <Main isNavHorizontal={isNavHorizontal}>{children}</Main>
    </LayoutSection>
  );
}
