import WbSunnyIcon from '@mui/icons-material/WbSunny';
import UmbrellaIcon from '@mui/icons-material/Umbrella';
import SettingsIcon from '@mui/icons-material/Settings';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { Label } from 'src/components/dashboard/label';
import { SvgColor } from 'src/components/dashboard/svg-color';

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
  gift: icon('ic-gift'),
  video: icon('ic-video'),
  goodMemo: <WbSunnyIcon sx={{ width: 1, height: 1 }} />,
  sadMemo: <UmbrellaIcon sx={{ width: 1, height: 1 }} />,
  settings: <SettingsIcon sx={{ width: 1, height: 1 }} />,
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
      { 
        title: 'My Universe', 
        path: paths.dashboard.homeSpace.root, 
        icon: ICONS.universe,
        children: [
          { title: 'Welcome Guest Area', path: paths.dashboard.homeSpace.guestArea },
          { title: 'Design Space', path: paths.dashboard.homeSpace.designSpace },
          { title: 'Things To Share', path: paths.dashboard.homeSpace.thingsToShare },
        ],
      },
      { title: 'Home Space', path: paths.dashboard.preview, icon: ICONS.home },
      { 
        title: 'Blogs', 
        path: paths.dashboard.blog.root, 
        icon: ICONS.blog,
        children: [
          { title: 'Create New Blog', path: paths.dashboard.blog.new },
          { title: 'Blog List', path: paths.dashboard.blog.list },
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
          { title: 'Gifts and Souvenir', path: paths.dashboard.drawer.gift.root, icon: ICONS.gift },
          { title: 'Good Memories', path: paths.dashboard.drawer.goodMemo, icon: ICONS.goodMemo },          
          { title: 'Sad Memories', path: paths.dashboard.drawer.sadMemo, icon: ICONS.sadMemo },
        ],
      },
      {
        title: 'Collections',
        path: paths.dashboard.collections.root,
        icon: ICONS.course,
        children: [
          {
            title: 'Manage Collections',
            path: paths.dashboard.collections.manage,
            slotProps: {
              title: { color: '#8B0000' },
            },
          },
        ],
      },
      { title: 'Friends', path: paths.dashboard.friend, icon: ICONS.friend },
      { 
        title: 'Community', 
        path: paths.dashboard.community.root, 
        icon: ICONS.star, 
        children: [
          { title: 'Posts', path: paths.dashboard.community.post.list },
          { title: 'Neighbors', path: paths.dashboard.community.neighbor.root },          
          { title: 'Coffee Shops', path: paths.dashboard.community.coffeeShop },
          { title: 'Cinema', path: paths.dashboard.community.cinema },
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
      },
      {
        title: 'Settings',
        path: paths.dashboard.settings.root,
        icon: ICONS.settings,
        children: [
          { title: 'Profile', path: paths.dashboard.settings.profile },
          { title: 'Appearance', path: paths.dashboard.settings.appearance },
          { title: 'Account', path: paths.dashboard.settings.account },
          
        ],
      }
    ],
  },
];
