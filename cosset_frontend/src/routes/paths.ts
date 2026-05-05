// ----------------------------------------------------------------------

const ROOTS = {
  HOME: '/home',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  UNIVERSE: '/universe',
};

// ----------------------------------------------------------------------

export const paths = {
  home: ROOTS.HOME,
  faqs: '/faqs',
  // AUTH
  auth: {
    signIn: '/sign-in',
    signUp: '/sign-up',
    resetPassword: '/reset-password',
  },
  // DASHBOARD
  dashboard: {
    // root: ROOTS.DASHBOARD,
    root: `${ROOTS.DASHBOARD}/home-space/guest-area`,
    preview: `${ROOTS.DASHBOARD}/preview`,
    blog: {
      root: `${ROOTS.DASHBOARD}/blog`,
      list: `${ROOTS.DASHBOARD}/blog`,
      new: `${ROOTS.DASHBOARD}/blog/new`,
      details: (id: string | number) => `${ROOTS.DASHBOARD}/blog/${id}`,
      edit: (id: string | number) => `${ROOTS.DASHBOARD}/blog/${id}/edit`,
    },
    homeSpace: {
      root: `${ROOTS.DASHBOARD}/home-space`,
      guestArea: `${ROOTS.DASHBOARD}/home-space/guest-area`,
      designSpace: `${ROOTS.DASHBOARD}/home-space/design-space`,
      thingsToShare: `${ROOTS.DASHBOARD}/home-space/things-to-share`,
    },
    album: {
      root: `${ROOTS.DASHBOARD}/album`,
      new: `${ROOTS.DASHBOARD}/album/new`,
      details: (id: string | number) => `${ROOTS.DASHBOARD}/album/${id}`,
      edit: (id: string | number) => `${ROOTS.DASHBOARD}/album/${id}/edit`,
    },
    drawer: {
      root: `${ROOTS.DASHBOARD}/drawer`,
      gift: { 
        root: `${ROOTS.DASHBOARD}/drawer/gift`,
        new: `${ROOTS.DASHBOARD}/drawer/gift/new`,
        details: (id: string | number) => `${ROOTS.DASHBOARD}/drawer/gift/${id}`,
        edit: (id: string | number) => `${ROOTS.DASHBOARD}/drawer/gift/${id}/edit`,
      },
      letter: {
        root: `${ROOTS.DASHBOARD}/drawer/letter`,
        new: `${ROOTS.DASHBOARD}/drawer/letter/new`,
        edit: (id: string | number) => `${ROOTS.DASHBOARD}/drawer/letter/${id}/edit`,
      },
      goodMemo: {
        root: `${ROOTS.DASHBOARD}/drawer/goodMemo`,
        new: `${ROOTS.DASHBOARD}/drawer/goodMemo/new`,
        edit: (id: string | number) => `${ROOTS.DASHBOARD}/drawer/goodMemo/${id}/edit`,
      },
      sadMemo: {
        root: `${ROOTS.DASHBOARD}/drawer/sadMemo`,
        new: `${ROOTS.DASHBOARD}/drawer/sadMemo/new`,
        edit: (id: string | number) => `${ROOTS.DASHBOARD}/drawer/sadMemo/${id}/edit`,
      },
    },
    collections: {
      root: `${ROOTS.DASHBOARD}/collections`,
      manage: `${ROOTS.DASHBOARD}/collections/manage`,
      items: (collectionId: string | number) =>
        `${ROOTS.DASHBOARD}/collections/items/${collectionId}`,
      newItem: (collectionId: string | number) =>
        `${ROOTS.DASHBOARD}/collections/items/${collectionId}/new`,
      editItem: (collectionId: string | number, itemId: string | number) =>
        `${ROOTS.DASHBOARD}/collections/items/${collectionId}/${itemId}/edit`,
    },
    friend: `${ROOTS.DASHBOARD}/friend`,
    community: {
      root: `${ROOTS.DASHBOARD}/community`,
      neighbor: {
        root: `${ROOTS.DASHBOARD}/community/neighbor`,
        details: (id: string) => `${ROOTS.DASHBOARD}/community/neighbor/${id}`,
      },
      post: {
        root: `${ROOTS.DASHBOARD}/community/post`,
        list: `${ROOTS.DASHBOARD}/community/post`,
        new: `${ROOTS.DASHBOARD}/community/post/new`,
        edit: (id: string | number) => `${ROOTS.DASHBOARD}/community/post/${id}`,
      },
      coffeeShop: {
        root: `${ROOTS.DASHBOARD}/community/coffee-shop`,
        list: `${ROOTS.DASHBOARD}/community/coffee-shop`,
        new: `${ROOTS.DASHBOARD}/community/coffee-shop/new`,
        edit: (id: string | number) => `${ROOTS.DASHBOARD}/community/coffee-shop/${id}`,
        view: (id: string | number) => `${ROOTS.UNIVERSE}/community/coffee-shop/${id}/view`,
      },
      cinema:  `${ROOTS.DASHBOARD}/community/cinema`,
    },
    mail: `${ROOTS.DASHBOARD}/mail`,
    chat: `${ROOTS.DASHBOARD}/chat`,
    settings: {
      root: `${ROOTS.DASHBOARD}/settings`,
      profile: `${ROOTS.DASHBOARD}/settings/profile`,
      appearance: `${ROOTS.DASHBOARD}/settings/appearance`,
      account: `${ROOTS.DASHBOARD}/settings/account`,      
    },
    auth: {
      signIn: `${ROOTS.DASHBOARD}/sign-in`,
      signUp: `${ROOTS.DASHBOARD}/sign-up`,
      resetPassword: `${ROOTS.DASHBOARD}/reset-password`,
    },
  },
  // UNIVERSE
  universe: {
    view: (id: string) => `${ROOTS.UNIVERSE}/${id}/view`,
    blogs: (customerId: string) => `${ROOTS.UNIVERSE}/${customerId}/blogs`,
    blog: (customerId: string, blogId: string | number) =>
      `${ROOTS.UNIVERSE}/${customerId}/blogs/${blogId}`,
    collections: (customerId: string) => `${ROOTS.UNIVERSE}/${customerId}/collections`,
    collectionItems: (customerId: string, collectionId: string | number) =>
      `${ROOTS.UNIVERSE}/${customerId}/collections/${collectionId}`,
    // Albums
    albums: `${ROOTS.UNIVERSE}/albums`,
    album: (id: string | number) => `${ROOTS.UNIVERSE}/albums/${id}`,
    gifts: `${ROOTS.UNIVERSE}/gifts`,
    gift: (customerId: string, id: string | number) => `${ROOTS.UNIVERSE}/${customerId}/gifts/${id}`,
    // Drawer
    drawer: {
      item: (customerId: string, category: string) =>
        `${ROOTS.UNIVERSE}/${customerId}/drawer/${encodeURIComponent(category)}`,
    },
    /**
     * Marketing
     */
    marketing: {
      root: '/marketing',
      services: '/marketing/services',
      caseStudies: '/marketing/case-studies',
      caseStudy: (id: string) => `/marketing/case-studies/${id}`,
      posts: '/marketing/posts',
      post: '/marketing/posts/details',
      about: '/marketing/about',
      contact: '/marketing/contact',
    },
    /**
     * Travel
     */
    travel: {
      root: '/travel',
      tours: '/travel/tours',
      tour: '/travel/tours/details',
      checkout: '/travel/checkout',
      orderCompleted: '/travel/order-completed',
      posts: '/travel/posts',
      post: '/travel/posts/details',
      about: '/travel/about',
      contact: '/travel/contact',
    },
    /**
     * Career
     */
    career: {
      root: '/career',
      jobs: '/career/jobs',
      job: '/career/jobs/details',
      posts: '/career/posts',
      post: '/career/posts/details',
      about: '/career/about',
      contact: '/career/contact',
    },
    /**
     * E-learning
     */
    eLearning: {
      root: '/e-learning',
      courses: '/e-learning/courses',
      course: '/e-learning/courses/details',
      posts: '/e-learning/posts',
      post: '/e-learning/posts/details',
      about: '/e-learning/about',
      contact: '/e-learning/contact',
    },
    /**
     * E-commerce
     */
    eCommerce: {
      root: '/e-commerce',
      products: '/e-commerce/products',
      product: '/e-commerce/products/details',
      cart: '/e-commerce/cart',
      checkout: '/e-commerce/checkout',
      orderCompleted: '/e-commerce/order-completed',
      wishlist: '/e-commerce/wishlist',
      compare: '/e-commerce/compare',
    },
    /**
     * Account
     */
    account: {
      root: '/account',
      personal: '/account/personal',
      wishlist: '/account/wishlist',
      vouchers: '/account/vouchers',
      orders: '/account/orders',
      payment: '/account/payment',
    },
    /**
     * Auth
     */
    split: {
      signIn: '/split/sign-in',
      signUp: '/split/sign-up',
    },
    centered: {
      signIn: '/centered/sign-in',
      signUp: '/centered/sign-up',
    },
    illustration: {
      signIn: '/illustration/sign-in',
      signUp: '/illustration/sign-up',
    },
    verify: '/verify',
    resetPassword: '/reset-password',
    updatePassword: '/update-password',
    /**
     * Common
     */
    maintenance: '/maintenance',
    comingsoon: '/coming-soon',
    pricingCards: '/pricing-cards',
    pricingColumns: '/pricing-columns',
    payment: '/payment',
    support: '/support',
    page404: '/error/404',
    page500: '/error/500',
    /**
     * Others
     */
    components: '/components',
    pages: '/pages',
    docs: 'https://zone-docs.vercel.app',
    license: 'https://material-ui.com/store/license/#i-standard-license',
    minimalStore: 'https://material-ui.com/store/items/minimal-dashboard',
    zoneStore: 'https://mui.com/store/items/zone-landing-page/',
    figmaUrl: 'https://www.figma.com/design/NnFigTvU16Mk9lsLZR7bzR/%5BPreview%5D-Zone_Web.v3.0.0',
  }
};
