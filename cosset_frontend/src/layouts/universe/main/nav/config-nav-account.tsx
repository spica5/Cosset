import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

export const navAccountData = [
  {
    title: 'Dashboard',
    path: paths.dashboard.root,
    icon: <Iconify icon="carbon:dashboard" />,
    roles: [ 'admin', 'user' ],
  },
];

export const navAccountDataGuest = [
  {
    title: 'Login',
    path: paths.auth.signIn,
    icon: <Iconify icon="carbon:login" />,
  },
  {
    title: 'Register',
    path: paths.auth.signUp,
    icon: <Iconify icon="carbon:user-follow" />,
  },
];