import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { Label } from 'src/components/dashboard/label';
import { SvgColor } from 'src/components/dashboard/svg-color';
import { chip } from 'src/theme/dashboard/core/components/chip';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.dashboard.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  home: icon('ic-home'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  star: icon('ic-star'),
  tour: icon('ic-tour'),
  album: icon('ic-album'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  drawer: icon('ic-drawer'),
  friend: icon('ic-friend'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  universe: icon('ic-universe'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  parameter: icon('ic-parameter'),
};

// ----------------------------------------------------------------------

export const navData = [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      { title: 'My Universe', path: paths.dashboard.root, icon: ICONS.universe },
      { 
        title: 'Home Space', 
        path: paths.dashboard.homeSpace.root, 
        icon: ICONS.home,
        children: [
          { title: 'Welcome Guest Area', path: paths.dashboard.homeSpace.guestArea },
          { title: 'Design Space', path: paths.dashboard.homeSpace.designSpace },
          { title: 'Things To Share', path: paths.dashboard.homeSpace.thingsToShare },
        ],
      },
      { 
        title: 'Albums', 
        path: paths.dashboard.album.root, 
        icon: ICONS.album,
        children: [
          { title: 'Create New Album', path: paths.dashboard.album.new },
          { title: 'Album List', path: paths.dashboard.album.root },
        ],
      },
      { 
        title: 'Drawers', 
        path: paths.dashboard.drawer.root, 
        icon: ICONS.drawer,
        children: [
          { title: 'Gift', path: paths.dashboard.drawer.gift.root },
          { title: 'Good memorize', path: paths.dashboard.drawer.goodMemo },          
          { title: 'Sad memorize', path: paths.dashboard.drawer.sadMemo },
        ],
      },
      { title: 'Friends', path: paths.dashboard.friend, icon: ICONS.friend },
      { 
        title: 'Community', 
        path: paths.dashboard.community.root, 
        icon: ICONS.star, 
        children: [
          { title: 'Neighbors', path: paths.dashboard.community.neighbor.root },
          { title: 'Coffee Shops', path: paths.dashboard.community.coffeeShop },
        ],
      },
      {
        title: 'Mail',
        path: paths.dashboard.mail,
        icon: ICONS.mail,
        info: (
          <Label color="error" variant="inverted">
            +32
          </Label>
        ),
      },
      {
        title: 'Chat',
        path: paths.dashboard.chat,
        icon: ICONS.chat,
      }
    ],
  },
];
