// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  CUSTOMER: '/customer',
  PAYMENT: '/payment',
  ADVERTISEMENT: '/advertisement',
  MANAGEMENT: '/management',
};

// ----------------------------------------------------------------------

export const paths = {
  faqs: '/faqs',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: {
      signIn: `${ROOTS.AUTH}/auth0/sign-in`,
    },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    group: {
      root: `${ROOTS.DASHBOARD}/group`,
      five: `${ROOTS.DASHBOARD}/group/five`,
      six: `${ROOTS.DASHBOARD}/group/six`,
    },
  },
  customer: {
    root: ROOTS.CUSTOMER,
    new: `${ROOTS.CUSTOMER}/new`,
    edit: (id: string | number) => `${ROOTS.CUSTOMER}/${id}/edit`,
  },
  payment: {
    root: ROOTS.PAYMENT,
  },
  advertisement: {
    root: ROOTS.ADVERTISEMENT,
  },
  management: {
    root: ROOTS.MANAGEMENT,
    media: {
      root: `${ROOTS.MANAGEMENT}/media`,
      cinema: {
        root: `${ROOTS.MANAGEMENT}/media/cinema`,
        view: (categoryId: string) => `${ROOTS.MANAGEMENT}/media/cinema/${categoryId}`,
      },
      introVideo: `${ROOTS.MANAGEMENT}/media/intro-video`,
      files: `${ROOTS.MANAGEMENT}/media/files`,
    },
  },
};
