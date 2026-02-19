import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

export const navData = [
  {
    title: 'Personal',
    path: paths.universe.account.personal,
    icon: <Iconify icon="solar:user-rounded-outline" />,
  },
  {
    title: 'Wishlist',
    path: paths.universe.account.wishlist,
    icon: <Iconify icon="solar:heart-outline" />,
  },
  {
    title: 'Vouchers',
    path: paths.universe.account.vouchers,
    icon: <Iconify icon="carbon:cut-out" />,
  },
  {
    title: 'Orders',
    path: paths.universe.account.orders,
    icon: <Iconify icon="solar:cart-3-outline" />,
  },
  {
    title: 'Payment',
    path: paths.universe.account.payment,
    icon: <Iconify icon="solar:card-outline" />,
  },
];
